import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SCREENSHOTS_DIR = ".screenshots";
const SCREENSHOT_RETENTION_COUNT = 10;
const SCREENSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const CONSOLE_RING_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_OPEN_TIMEOUT_MS = 10_000;
const DEFAULT_RELOAD_TIMEOUT_MS = 10_000;
const MAX_STDERR_SNIPPET = 1_000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

type ToolCtx = Parameters<NonNullable<Parameters<ExtensionAPI["on"]>[1]>>[1];
type ExecResult = { code: number; stdout: string; stderr: string };
type BackendMode = "playwright-cli" | "npx playwright-cli";
type ErrorCode =
	| "BACKEND_NOT_AVAILABLE"
	| "NO_SESSION"
	| "INVALID_ARGUMENT"
	| "INVALID_URL"
	| "OPEN_FAILED"
	| "LOAD_TIMEOUT"
	| "CANVAS_NOT_FOUND"
	| "ACTION_FAILED"
	| "SNAPSHOT_FAILED"
	| "GEOMETRY_READ_FAILED"
	| "CONSOLE_READ_FAILED"
	| "STATUS_CHECK_FAILED";

interface BackendCommand {
	mode: BackendMode;
	command: string;
	baseArgs: string[];
}

interface ViewportSize {
	width: number;
	height: number;
}

interface CanvasInfo {
	index: number;
	x: number;
	y: number;
	width: number;
	height: number;
	visible: boolean;
}

interface GeometryResult {
	url: string;
	viewport: ViewportSize;
	devicePixelRatio: number;
	canvases: CanvasInfo[];
	activeCanvas: CanvasInfo | null;
	selectionReason: "largest-visible-canvas" | null;
}

interface ConsoleMessage {
	type: "warning" | "error";
	text: string;
	timestamp?: number;
	location?: {
		url?: string;
		line?: number;
		column?: number;
	};
}

interface SessionState {
	projectRoot: string;
	sessionName: string | null;
	backendCommand: BackendCommand | null;
	url: string | null;
	configuredViewport: ViewportSize | null;
	screenshotsDir: string;
	snapshotCounter: number;
	consoleRecentRingBuffer: ConsoleMessage[];
	consoleRecentRingLimit: number;
	sessionActive: boolean;
	lastScreenshotPath: string | null;
}

const geometryScript = `
async (page) => {
  const result = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dpr = window.devicePixelRatio ?? 1;
    const isFiniteNumber = (value) => Number.isFinite(value);
    const intersectsViewport = (rect) =>
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < viewportWidth &&
      rect.top < viewportHeight;
    const canvases = Array.from(document.querySelectorAll("canvas")).map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        intersectsViewport(rect);
      return {
        index,
        x: isFiniteNumber(rect.x) ? rect.x : 0,
        y: isFiniteNumber(rect.y) ? rect.y : 0,
        width: isFiniteNumber(rect.width) ? rect.width : 0,
        height: isFiniteNumber(rect.height) ? rect.height : 0,
        visible
      };
    });
    const activeCanvas = canvases
      .filter((canvas) => canvas.visible)
      .sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
    return {
      url: window.location.href,
      viewport: {
        width: viewportWidth,
        height: viewportHeight
      },
      devicePixelRatio: dpr,
      canvases,
      activeCanvas,
      selectionReason: activeCanvas ? "largest-visible-canvas" : null
    };
  });
  return JSON.stringify(result);
}
`.trim();

const focusCanvasScript = `
async (page) => {
  const result = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const intersectsViewport = (rect) =>
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < viewportWidth &&
      rect.top < viewportHeight;
    const canvases = Array.from(document.querySelectorAll("canvas")).map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const style = window.getComputedStyle(canvas);
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        intersectsViewport(rect);
      return { canvas, area: rect.width * rect.height, visible };
    });
    const active = canvases
      .filter((entry) => entry.visible)
      .sort((a, b) => b.area - a.area)[0]?.canvas ?? null;
    if (!active) {
      return {
        focusAttempted: true,
        focusSucceeded: false,
        focusTarget: "page"
      };
    }
    if (!active.hasAttribute("tabindex")) {
      active.setAttribute("tabindex", "-1");
    }
    active.focus({ preventScroll: true });
    return {
      focusAttempted: true,
      focusSucceeded: document.activeElement === active,
      focusTarget: "canvas"
    };
  });
  return JSON.stringify(result);
}
`.trim();

export default function (pi: ExtensionAPI) {
	const state: SessionState = {
		projectRoot: "",
		sessionName: null,
		backendCommand: null,
		url: null,
		configuredViewport: null,
		screenshotsDir: SCREENSHOTS_DIR,
		snapshotCounter: 0,
		consoleRecentRingBuffer: [],
		consoleRecentRingLimit: CONSOLE_RING_LIMIT,
		sessionActive: false,
		lastScreenshotPath: null,
	};

	pi.on("session_start", async (_event, ctx) => {
		state.projectRoot = ctx.cwd;
		state.screenshotsDir = SCREENSHOTS_DIR;
	});

	pi.on("session_shutdown", async () => {
		await closeActiveSession(pi, state);
		clearSessionState(state, { keepBackend: false });
	});

	const sharedGuidelines = [
		"Use `game_open` before other `game_*` tools unless you are only checking `game_status`.",
		"Only local URLs are allowed: `localhost`, `127.0.0.1`, or `::1` over `http` or `https`.",
		"`space: \"viewport\"` means coordinates relative to the top-left of the configured browser viewport; `space: \"canvas\"` means coordinates relative to the top-left of the currently detected active canvas.",
		"`space: \"canvas\"` tools live-refresh geometry before acting and fail with `CANVAS_NOT_FOUND` if no visible active canvas is detected.",
		"`timeoutMs` limits how long the command may run; it does not insert any wait by itself.",
		"`waitAfterMs` is only a post-action settle delay on that same tool call; use `game_wait` when you want an explicit standalone pause between separate steps.",
		"`game_snapshot` captures the visible viewport and stores screenshots under `.screenshots/`; it does not crop to canvas.",
		"`game_press` uses safe focus behavior and does not auto-click to steal focus.",
		"`game_drag` is atomic and cannot produce a screenshot in the middle of the drag.",
	];

	const openGuidelines = [
		...sharedGuidelines,
		"`game_open` requires an explicit `viewport`; use it whenever you need a new URL or viewport, or when no session exists yet.",
		"If the same URL and viewport are already alive, `game_open` reuses the session instead of reloading it.",
		"Use `waitAfterMs` on `game_open` when the page loads quickly but the game boot sequence needs a little extra time before inspection or input.",
	];

	const reloadGuidelines = [
		...sharedGuidelines,
		"`game_reload` is the preferred way to refresh after local code changes without replacing the session.",
		"Use `waitAfterMs` on `game_reload` when the page load is finished but in-game assets, scene transitions, or boot logic still need a small settle delay.",
	];

	const snapshotGuidelines = [
		...sharedGuidelines,
		"Use `game_snapshot` when you need visual proof of the current viewport or when you want image + fresh warning/error signals together.",
		"`game_snapshot` returns only fresh warning/error messages observed at snapshot time and then attempts to clear the live console buffer.",
		"If you only need geometry without an image, prefer `game_inspect`; if you only need logs, prefer `game_console`.",
	];

	const inspectGuidelines = [
		...sharedGuidelines,
		"Use `game_inspect` when you need viewport size, device pixel ratio, canvas list, or active canvas bounds without taking a screenshot.",
		"`game_inspect` is the best precursor for deciding canvas-relative coordinates before `game_click`, `game_move_mouse`, or `game_drag`.",
	];

	const consoleGuidelines = [
		...sharedGuidelines,
		"`game_console` only returns warning/error messages, not general log/info/debug output.",
		"Default `game_console` behavior is stateful: it returns only new unread warning/error messages from the current live buffer, then marks them as read and attempts to clear the live buffer.",
		"`game_console all: true` is limited history: it includes unread live messages plus the extension's small recent ring buffer tail; it is not full session history.",
		"Use `game_console` when you need logs without taking a screenshot; use `game_snapshot` when you want visual state and fresh logs together.",
	];

	const pressGuidelines = [
		...sharedGuidelines,
		"Use `game_press` for keyboard-driven gameplay or UI input; use `mode: \"down\"` and `mode: \"up\"` only when you need to hold or release keys explicitly.",
		"The default `mode` is `press`, which is the right choice for ordinary taps like arrows, `Space`, or single shortcuts.",
		"Valid `key` strings follow Playwright keyboard syntax: a single printable character like `a`, `A`, or `1`; a named key like `Enter`, `Tab`, `Escape`, `Space`, `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Backspace`, `Delete`, `Home`, `End`, `PageUp`, `PageDown`; a code-style key like `KeyA`, `Digit1`, or `F5`; or a shortcut such as `Control+a`, `Control+Shift+T`, `Shift+Tab`, or `ControlOrMeta+A`.",
		"`ControlOrMeta` is the safest cross-platform modifier for common shortcuts because Playwright resolves it to `Control` on Windows/Linux and `Meta` on macOS.",
		"Use `waitAfterMs` when a key press triggers a transition or animation and you want the tool call itself to include that short settle delay.",
	];

	const mouseGuidelines = [
		...sharedGuidelines,
		"Use `space: \"viewport\"` when you already know coordinates in the browser viewport; use `space: \"canvas\"` when coordinates are naturally relative to the gameplay canvas.",
		"For canvas-relative actions, it is often useful to call `game_inspect` or `game_snapshot` first so you can see the active canvas bounds.",
		"`button` defaults to `left`; override it only when you intentionally need middle-click or right-click behavior.",
	];

	const moveMouseGuidelines = [
		...mouseGuidelines,
		"Use `game_move_mouse` when hover position matters before a later click or drag, or when the game reacts to cursor motion alone.",
		"`durationMs` defaults to `0` for an immediate move; increase it when you need a slower visible sweep or to trigger motion-sensitive behavior.",
	];

	const clickGuidelines = [
		...mouseGuidelines,
		"Use `game_click` for discrete click actions. If hover state matters first, call `game_move_mouse` before `game_click`.",
		"`clickCount` defaults to `1`; use `2` only when the page or game genuinely expects a double-click.",
	];

	const dragGuidelines = [
		...mouseGuidelines,
		"Use `game_drag` when the gesture must remain one atomic drag action, such as moving a slider, panning, or dragging an in-game object.",
		"`durationMs` is required because drag timing affects the interpolation path and pace of the gesture.",
	];

	const waitGuidelines = [
		...sharedGuidelines,
		"Use `game_wait` for an explicit standalone pause between separate actions, especially when no single preceding tool should own the delay.",
		"Prefer `waitAfterMs` only for a short settle delay that conceptually belongs to the same action that triggered it.",
	];

	const statusGuidelines = [
		...sharedGuidelines,
		"Use `game_status` to diagnose backend availability, whether the remembered session is still alive, what URL/viewport are stored, and whether a live active canvas is currently detectable.",
		"`game_status` is diagnostic and should not clear console state while checking it.",
	];

	const closeGuidelines = [
		...sharedGuidelines,
		"Use `game_close` when testing is finished or before intentionally starting over with a clean browser session.",
		"`game_close` is idempotent: it still succeeds when no active session exists.",
	];

	const timeoutField = (defaultMs: number, useCase: string) =>
		Type.Optional(
			Type.Integer({
				minimum: 1,
				maximum: 120000,
				description: `Maximum time this command may run, in milliseconds. Default: ${defaultMs}ms. Increase it when ${useCase}. This does not add a post-action pause.`,
			})
		);

	const waitAfterField = (actionDescription: string) =>
		Type.Optional(
			Type.Integer({
				minimum: 0,
				maximum: 60000,
				description: `Optional extra delay after ${actionDescription}, in milliseconds. Default: 0ms. Use it when the game reacts asynchronously and you want this same tool call to include a short settle wait. Prefer \`game_wait\` for a standalone pause between separate actions.`,
			})
		);

	const spaceField = () =>
		Type.Union([Type.Literal("viewport"), Type.Literal("canvas")], {
			description:
				"Coordinate space for this action. `viewport` means coordinates are relative to the browser viewport origin (top-left). `canvas` means coordinates are relative to the currently detected active canvas origin (top-left) and requires a visible active canvas at call time.",
		});

	const xField = (name: string) =>
		Type.Number({
			description: `${name} coordinate in the chosen space. Must be a finite number. Origin is top-left. For \`viewport\`, the point must stay within the configured viewport bounds. For \`canvas\`, the point must stay within the current active canvas bounds.`,
		});

	const durationField = (defaultMs: number, purpose: string, required: boolean) =>
		required
			? Type.Integer({
					minimum: 1,
					maximum: 60000,
					description: `Gesture duration in milliseconds. Required for this tool because ${purpose}.`,
				})
			: Type.Optional(
					Type.Integer({
						minimum: 0,
						maximum: 60000,
						description: `Gesture duration in milliseconds. Default: ${defaultMs}ms. Use a larger value when ${purpose}; use 0 for an immediate action.`,
					})
				);

	registerTool(pi, {
		name: "game_open",
		label: "Game Open",
		description:
			"Open a local game URL in a named headless Chrome session, or reuse the current session if the same URL and viewport are already alive. Use this first before most other `game_*` tools.",
		promptSnippet:
			"`game_open`: start browser testing for a local game. Call this first with a local URL and explicit viewport. Reuse it when the same URL and viewport should stay open; prefer `game_reload` instead of calling `game_open` again after code edits.",
		promptGuidelines: openGuidelines,
		parameters: Type.Object(
			{
				url: Type.String({
					description:
						"Required local game URL to open. Allowed hosts are only `localhost`, `127.0.0.1`, or `::1`. Paths, query strings, and hash fragments are allowed. External hosts are rejected.",
				}),
				viewport: Type.Object(
					{
						width: Type.Integer({
							minimum: 100,
							maximum: 4000,
							description:
								"Required viewport width in CSS pixels. Use an explicit width so runs stay reproducible across desktop and mobile testing.",
						}),
						height: Type.Integer({
							minimum: 100,
							maximum: 4000,
							description:
								"Required viewport height in CSS pixels. Use an explicit height so runs stay reproducible across desktop and mobile testing.",
						}),
					},
					{
						additionalProperties: false,
						description:
							"Required browser viewport size. There is no implicit default; you must choose width and height explicitly.",
					}
				),
				timeoutMs: timeoutField(DEFAULT_OPEN_TIMEOUT_MS, "the page needs longer to open or reach the `load` event"),
				waitAfterMs: waitAfterField("page load succeeds"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameOpen(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_reload",
		label: "Game Reload",
		description:
			"Reload the current page inside the active game browser session. Use this after local code changes when you want to keep the same session and viewport.",
		promptSnippet:
			"`game_reload`: refresh the current session after code edits. Prefer this over `game_open` when the URL and viewport should stay the same.",
		promptGuidelines: reloadGuidelines,
		parameters: Type.Object(
			{
				timeoutMs: timeoutField(DEFAULT_RELOAD_TIMEOUT_MS, "reload or the post-reload `load` event may take longer than usual"),
				waitAfterMs: waitAfterField("the reload finishes"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameReload(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_snapshot",
		label: "Game Snapshot",
		description:
			"Capture a viewport screenshot of the current browser view and also return current geometry plus fresh warning/error console signals. Use this when you need visual confirmation.",
		promptSnippet:
			"`game_snapshot`: capture the visible viewport as an image, report active canvas geometry, and consume fresh warning/error console messages from the live buffer.",
		promptGuidelines: snapshotGuidelines,
		parameters: Type.Object(
			{
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "the screenshot, geometry read, or console read may take longer on a heavy page"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameSnapshot(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_inspect",
		label: "Game Inspect",
		description:
			"Read runtime viewport and canvas geometry without taking a screenshot. Use this to understand layout, active canvas bounds, and coordinate targets.",
		promptSnippet:
			"`game_inspect`: inspect viewport, device pixel ratio, all canvases, and the selected active canvas without mutating visual or console state.",
		promptGuidelines: inspectGuidelines,
		parameters: Type.Object(
			{
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "geometry inspection may take longer due to a busy page or slow script evaluation"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameInspect(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_console",
		label: "Game Console",
		description:
			"Read warning/error console messages from the active session. Default behavior is stateful: it consumes only new unread live messages, then attempts to clear the live buffer.",
		promptSnippet:
			"`game_console`: read warning/error console messages without taking a screenshot. Default calls consume only fresh unread live messages; `all: true` also includes a limited recent ring-buffer tail, not full session history.",
		promptGuidelines: consoleGuidelines,
		parameters: Type.Object(
			{
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "console inspection may take longer on a busy session"),
				all: Type.Optional(
					Type.Boolean({
						description:
							"Optional history mode. Default: `false`. When `false`, return only fresh unread warning/error messages from the current live buffer. When `true`, also include the extension's limited recent ring-buffer tail as `recentMessages`. This is still not full session history.",
					})
				),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameConsole(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_press",
		label: "Game Press",
		description:
			"Send keyboard input to the active session. The tool first tries to focus the active canvas safely, then falls back to page-level input without auto-clicking.",
		promptSnippet:
			"`game_press`: send keyboard input such as arrows, `Space`, or shortcuts. Default `mode` is `press`; use `down`/`up` only when you need explicit key hold behavior.",
		promptGuidelines: pressGuidelines,
		parameters: Type.Object(
			{
				key: Type.String({
					minLength: 1,
					description:
						"Required Playwright key string. Valid forms include: a single printable character such as `a`, `A`, `1`, or `$`; a named key such as `Enter`, `Tab`, `Escape`, `Space`, `Backspace`, `Delete`, `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Home`, `End`, `PageUp`, or `PageDown`; a code-style key such as `KeyA`, `Digit0`, or `F1` through `F12`; or a shortcut such as `Control+a`, `Control+Shift+T`, `Shift+Tab`, `Alt+Enter`, or `ControlOrMeta+A`. Use `ControlOrMeta` for cross-platform shortcuts. Single-character keys are case-sensitive, so `a` and `A` are different inputs.",
				}),
				mode: Type.Optional(
					Type.Union([Type.Literal("press"), Type.Literal("down"), Type.Literal("up")], {
						description:
							"Keyboard action mode. Default: `press`. Use `press` for an ordinary tap, `down` to hold a key down, and `up` to release a previously held key.",
					})
				),
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "focus evaluation or keyboard dispatch may take longer"),
				waitAfterMs: waitAfterField("the keyboard action is sent"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGamePress(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_move_mouse",
		label: "Game Move Mouse",
		description:
			"Move the mouse to viewport or active-canvas coordinates. Use this when hover state matters or before a later click/drag.",
		promptSnippet:
			"`game_move_mouse`: position the cursor without clicking. Useful for hover-driven UI, tooltip checks, aim previews, or preparing for a later click or drag.",
		promptGuidelines: moveMouseGuidelines,
		parameters: Type.Object(
			{
				space: spaceField(),
				x: xField("Horizontal"),
				y: xField("Vertical"),
				durationMs: durationField(0, "you want a slower visible cursor move or need to trigger motion-sensitive behavior", false),
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "geometry refresh or cursor movement may take longer"),
				waitAfterMs: waitAfterField("the cursor reaches its destination"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameMoveMouse(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_click",
		label: "Game Click",
		description:
			"Click at viewport or active-canvas coordinates. Use this for discrete pointer actions after you know the intended target point.",
		promptSnippet:
			"`game_click`: click once or twice at viewport or active-canvas coordinates. Use `button` only for non-left clicks and `clickCount: 2` only for true double-click behavior.",
		promptGuidelines: clickGuidelines,
		parameters: Type.Object(
			{
				space: spaceField(),
				x: xField("Horizontal"),
				y: xField("Vertical"),
				button: Type.Optional(
					Type.Union([Type.Literal("left"), Type.Literal("middle"), Type.Literal("right")], {
						description:
							"Mouse button to click. Default: `left`. Override only when the page or game specifically expects middle-click or right-click behavior.",
					})
				),
				clickCount: Type.Optional(
					Type.Union([Type.Literal(1), Type.Literal(2)], {
						description:
							"Number of clicks to send. Default: `1`. Use `2` only when you intentionally need a double-click.",
					})
				),
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "geometry refresh or click dispatch may take longer"),
				waitAfterMs: waitAfterField("the click completes"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameClick(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_drag",
		label: "Game Drag",
		description:
			"Perform one atomic drag gesture between two viewport or active-canvas points over a required duration. Use this for sliders, panning, or draggable gameplay elements.",
		promptSnippet:
			"`game_drag`: drag from one point to another as one continuous gesture. This tool is atomic, so use it when the drag itself matters more than mid-drag inspection.",
		promptGuidelines: dragGuidelines,
		parameters: Type.Object(
			{
				space: spaceField(),
				fromX: xField("Start horizontal"),
				fromY: xField("Start vertical"),
				toX: xField("End horizontal"),
				toY: xField("End vertical"),
				durationMs: durationField(0, "drag pacing changes the gesture and some targets only respond correctly to a timed drag", true),
				button: Type.Optional(
					Type.Union([Type.Literal("left"), Type.Literal("middle"), Type.Literal("right")], {
						description:
							"Mouse button used for the drag. Default: `left`. Override only when the target specifically expects another drag button.",
					})
				),
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "geometry refresh or the drag gesture may take longer"),
				waitAfterMs: waitAfterField("the drag finishes"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameDrag(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_wait",
		label: "Game Wait",
		description:
			"Explicitly pause between actions. Use this when no single preceding tool should own the delay and you want a clear standalone wait step.",
		promptSnippet:
			"`game_wait`: perform an intentional sleep between separate browser-game actions. Use this instead of stuffing long delays into unrelated tool calls.",
		promptGuidelines: waitGuidelines,
		parameters: Type.Object(
			{
				waitMs: Type.Integer({
					minimum: 1,
					maximum: 60000,
					description:
						"Required standalone wait duration in milliseconds. Use this for explicit pauses between steps, for example waiting for an animation, timed gameplay event, or delayed UI update.",
				}),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown) {
			return respondFrom(handleGameWait(params));
		},
	});

	registerTool(pi, {
		name: "game_status",
		label: "Game Status",
		description:
			"Inspect backend availability, whether an active session exists and is alive, and the currently known URL, viewport, active canvas, and console counters.",
		promptSnippet:
			"`game_status`: diagnose whether the browser backend is available, whether the stored session is alive, and what session state the extension currently remembers.",
		promptGuidelines: statusGuidelines,
		parameters: Type.Object(
			{
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "live health checks or geometry inspection may take longer"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameStatus(pi, ctx, state, params));
		},
	});

	registerTool(pi, {
		name: "game_close",
		label: "Game Close",
		description:
			"Close the active Playwright CLI browser session and clear in-memory state. Use this when testing is done or when you want to explicitly end the browser session.",
		promptSnippet:
			"`game_close`: end the active browser session. This tool is idempotent, so it still succeeds even if no session is currently active.",
		promptGuidelines: closeGuidelines,
		parameters: Type.Object(
			{
				timeoutMs: timeoutField(DEFAULT_TIMEOUT_MS, "closing the browser session may take longer on a busy machine"),
			},
			{ additionalProperties: false }
		),
		async execute(_toolCallId: string, params: unknown, _signal: AbortSignal, _onUpdate: unknown, ctx: ToolCtx) {
			return respondFrom(handleGameClose(pi, ctx, state, params));
		},
	});
}

function registerTool(pi: ExtensionAPI, definition: Record<string, unknown>) {
	(pi as any).registerTool(definition);
}

function respond(payload: Record<string, unknown>) {
	return {
		content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

async function respondFrom(work: Promise<Record<string, unknown>>) {
	try {
		return respond(await work);
	} catch (error) {
		return respond(normalizeThrownError(error));
	}
}

async function handleGameOpen(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const url = expectLocalUrl(params.url);
	const viewport = expectViewport(params.viewport);
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_OPEN_TIMEOUT_MS;
	const waitAfterMs = expectOptionalInt(params.waitAfterMs, 0, 60000) ?? 0;
	const backend = await ensureBackend(pi, ctx, state);
	if (!backend.ok) return backend.error;

	await cleanupScreenshots(state);

	const matchingSession =
		state.sessionActive &&
		state.sessionName &&
		state.url === url &&
		sameViewport(state.configuredViewport, viewport) &&
		state.backendCommand;

	if (matchingSession) {
		const ping = await pingSession(pi, ctx, state, timeoutMs);
		if (ping.ok && ping.runtimeUrl) {
			if (waitAfterMs > 0) await delay(waitAfterMs);
			const geometry = await tryReadGeometry(pi, ctx, state, timeoutMs);
			return {
				ok: true,
				requestedUrl: url,
				url: ping.runtimeUrl,
				configuredViewport: viewport,
				runtimeViewport: geometry.ok ? geometry.value.viewport : null,
				devicePixelRatio: geometry.ok ? geometry.value.devicePixelRatio : null,
				activeCanvas: geometry.ok ? geometry.value.activeCanvas : null,
				geometryReadSucceeded: geometry.ok,
				reusedSession: true,
			};
		}
	}

	const candidateSessionName = createSessionName(ctx.cwd);
	const openResult = await runBackend(
		pi,
		ctx,
		backend.value,
		candidateSessionName,
		["open", `--browser=chrome`, `--viewport-size=${viewport.width}x${viewport.height}`, url],
		timeoutMs
	);
	if (!openResult.ok) {
		return backendError("OPEN_FAILED", "Failed to open local game URL in Playwright CLI.", openResult.result, backend.value);
	}

	const waitForLoad = await runCode(
		pi,
		ctx,
		backend.value,
		candidateSessionName,
		`async (page) => { await page.waitForLoadState("load"); return "ok"; }`,
		timeoutMs
	);
	if (!waitForLoad.ok) {
		await bestEffortCloseSession(pi, ctx, backend.value, candidateSessionName);
		return backendError("LOAD_TIMEOUT", "Timed out waiting for page load in the new game session.", waitForLoad.result, backend.value);
	}

	if (waitAfterMs > 0) await delay(waitAfterMs);

	const geometry = await tryReadGeometryWithBackend(pi, ctx, backend.value, candidateSessionName, timeoutMs);
	const oldSessionName = state.sessionName;
	const oldBackend = state.backendCommand;
	setSessionState(state, {
		projectRoot: ctx.cwd,
		sessionName: candidateSessionName,
		backendCommand: backend.value,
		url,
		configuredViewport: viewport,
	});

	if (oldSessionName && oldBackend) {
		await bestEffortCloseSession(pi, ctx, oldBackend, oldSessionName);
	}

	return {
		ok: true,
		requestedUrl: url,
		url,
		configuredViewport: viewport,
		runtimeViewport: geometry.ok ? geometry.value.viewport : null,
		devicePixelRatio: geometry.ok ? geometry.value.devicePixelRatio : null,
		activeCanvas: geometry.ok ? geometry.value.activeCanvas : null,
		geometryReadSucceeded: geometry.ok,
		reusedSession: false,
	};
}

async function handleGameReload(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_RELOAD_TIMEOUT_MS;
	const waitAfterMs = expectOptionalInt(params.waitAfterMs, 0, 60000) ?? 0;
	const reloadResult = await runBackend(pi, ctx, session.backendCommand, session.sessionName, ["reload"], timeoutMs);
	if (!reloadResult.ok) {
		return backendError("LOAD_TIMEOUT", "Failed to reload the active game session.", reloadResult.result, session.backendCommand);
	}
	const waitForLoad = await runCode(
		pi,
		ctx,
		session.backendCommand,
		session.sessionName,
		`async (page) => { await page.waitForLoadState("load"); return "ok"; }`,
		timeoutMs
	);
	if (!waitForLoad.ok) {
		return backendError("LOAD_TIMEOUT", "Timed out waiting for the reloaded page to finish loading.", waitForLoad.result, session.backendCommand);
	}
	if (waitAfterMs > 0) await delay(waitAfterMs);
	const geometry = await tryReadGeometry(pi, ctx, state, timeoutMs);
	return {
		ok: true,
		url: state.url,
		configuredViewport: state.configuredViewport,
		runtimeViewport: geometry.ok ? geometry.value.viewport : null,
		devicePixelRatio: geometry.ok ? geometry.value.devicePixelRatio : null,
		activeCanvas: geometry.ok ? geometry.value.activeCanvas : null,
		geometryReadSucceeded: geometry.ok,
	};
}

async function handleGameSnapshot(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;

	await cleanupScreenshots(state);

	const absoluteDir = path.join(ctx.cwd, state.screenshotsDir);
	await fs.mkdir(absoluteDir, { recursive: true });
	state.snapshotCounter += 1;
	const filename = `${timestampForFilename(new Date())}-${String(state.snapshotCounter).padStart(3, "0")}.png`;
	const relativePath = path.posix.join(state.screenshotsDir, filename);
	const absolutePath = path.join(ctx.cwd, relativePath);

	const screenshotResult = await runBackend(
		pi,
		ctx,
		session.backendCommand,
		session.sessionName,
		["screenshot", `--filename=${absolutePath}`],
		timeoutMs
	);
	if (!screenshotResult.ok) {
		return backendError("SNAPSHOT_FAILED", "Failed to capture a game screenshot.", screenshotResult.result, session.backendCommand);
	}
	state.lastScreenshotPath = relativePath;

	const geometry = await tryReadGeometry(pi, ctx, state, timeoutMs);
	const consoleRead = await readCurrentConsoleMessages(pi, ctx, state, timeoutMs, true);

	return {
		ok: true,
		path: relativePath,
		viewport: geometry.ok ? geometry.value.viewport : null,
		devicePixelRatio: geometry.ok ? geometry.value.devicePixelRatio : null,
		activeCanvas: geometry.ok ? geometry.value.activeCanvas : null,
		currentConsoleMessages: consoleRead.ok ? consoleRead.currentMessages : [],
		geometryReadSucceeded: geometry.ok,
		consoleReadSucceeded: consoleRead.ok,
		consoleCleared: consoleRead.ok ? consoleRead.consoleCleared : false,
	};
}

async function handleGameInspect(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const geometry = await tryReadGeometry(pi, ctx, state, timeoutMs);
	if (!geometry.ok) {
		return geometry.error;
	}
	return {
		ok: true,
		url: geometry.value.url,
		configuredViewport: state.configuredViewport,
		runtimeViewport: geometry.value.viewport,
		devicePixelRatio: geometry.value.devicePixelRatio,
		canvases: geometry.value.canvases,
		activeCanvas: geometry.value.activeCanvas,
		selectionReason: geometry.value.selectionReason,
	};
}

async function handleGameConsole(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const includeRecent = params.all === true;

	const recentMessages = includeRecent ? [...state.consoleRecentRingBuffer] : [];
	const consoleRead = await readCurrentConsoleMessages(pi, ctx, state, timeoutMs, true);
	if (!consoleRead.ok) {
		return consoleRead.error;
	}

	return {
		ok: true,
		currentMessages: consoleRead.currentMessages,
		recentMessages,
		recentMessagesReadSucceeded: true,
		consoleCleared: consoleRead.consoleCleared,
	};
}

async function handleGamePress(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const key = expectString(params.key, 1);
	const mode = expectKeyMode(params.mode) ?? "press";
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const waitAfterMs = expectOptionalInt(params.waitAfterMs, 0, 60000) ?? 0;

	const focusResult = await runCode(pi, ctx, session.backendCommand, session.sessionName, focusCanvasScript, timeoutMs);
	const focusParsed = focusResult.ok ? parseJsonOutput<Record<string, unknown>>(focusResult.result.stdout) : null;
	const focusAttempted = focusParsed?.focusAttempted === true;
	const focusSucceeded = focusParsed?.focusSucceeded === true;
	const focusTarget = typeof focusParsed?.focusTarget === "string" ? focusParsed.focusTarget : "page";

	const command = mode === "down" ? "keydown" : mode === "up" ? "keyup" : "press";
	const action = await runBackend(pi, ctx, session.backendCommand, session.sessionName, [command, key], timeoutMs);
	if (!action.ok) {
		return backendError("ACTION_FAILED", "Failed to send keyboard input to the game session.", action.result, session.backendCommand);
	}
	if (waitAfterMs > 0) await delay(waitAfterMs);

	return {
		ok: true,
		key,
		resolvedKey: key,
		mode,
		focusAttempted,
		focusSucceeded,
		focusTarget,
		waitAfterMs,
	};
}

async function handleGameMoveMouse(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const space = expectSpace(params.space);
	const x = expectFiniteNumber(params.x, "x");
	const y = expectFiniteNumber(params.y, "y");
	const durationMs = expectOptionalInt(params.durationMs, 0, 60000) ?? 0;
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const waitAfterMs = expectOptionalInt(params.waitAfterMs, 0, 60000) ?? 0;
	const resolved = await resolvePoint(pi, ctx, state, space, x, y, timeoutMs);
	if (!resolved.ok) return resolved.error;

	const moveScript = `
async (page) => {
  const start = page.mouse;
  const x = ${JSON.stringify(resolved.value.x)};
  const y = ${JSON.stringify(resolved.value.y)};
  const durationMs = ${JSON.stringify(durationMs)};
  if (durationMs <= 0) {
    await start.move(x, y);
    return "ok";
  }
  const steps = Math.max(2, Math.min(120, Math.ceil(durationMs / 16)));
  await start.move(x, y, { steps });
  return "ok";
}
`.trim();
	const action = await runCode(pi, ctx, session.backendCommand, session.sessionName, moveScript, timeoutMs);
	if (!action.ok) {
		return backendError("ACTION_FAILED", "Failed to move the mouse in the game session.", action.result, session.backendCommand);
	}
	if (waitAfterMs > 0) await delay(waitAfterMs);

	return {
		ok: true,
		space,
		x,
		y,
		resolvedViewportPoint: resolved.value,
		durationMs,
		waitAfterMs,
	};
}

async function handleGameClick(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const space = expectSpace(params.space);
	const x = expectFiniteNumber(params.x, "x");
	const y = expectFiniteNumber(params.y, "y");
	const button = expectMouseButton(params.button) ?? "left";
	const clickCount = expectClickCount(params.clickCount) ?? 1;
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const waitAfterMs = expectOptionalInt(params.waitAfterMs, 0, 60000) ?? 0;
	const resolved = await resolvePoint(pi, ctx, state, space, x, y, timeoutMs);
	if (!resolved.ok) return resolved.error;

	const clickScript = `
async (page) => {
  await page.mouse.click(${JSON.stringify(resolved.value.x)}, ${JSON.stringify(resolved.value.y)}, {
    button: ${JSON.stringify(button)},
    clickCount: ${JSON.stringify(clickCount)}
  });
  return "ok";
}
`.trim();
	const action = await runCode(pi, ctx, session.backendCommand, session.sessionName, clickScript, timeoutMs);
	if (!action.ok) {
		return backendError("ACTION_FAILED", "Failed to click in the game session.", action.result, session.backendCommand);
	}
	if (waitAfterMs > 0) await delay(waitAfterMs);

	return {
		ok: true,
		space,
		x,
		y,
		button,
		clickCount,
		resolvedViewportPoint: resolved.value,
		waitAfterMs,
	};
}

async function handleGameDrag(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const session = ensureSession(state);
	if (!session.ok) return session.error;
	const space = expectSpace(params.space);
	const fromX = expectFiniteNumber(params.fromX, "fromX");
	const fromY = expectFiniteNumber(params.fromY, "fromY");
	const toX = expectFiniteNumber(params.toX, "toX");
	const toY = expectFiniteNumber(params.toY, "toY");
	const durationMs = expectInt(params.durationMs, "durationMs", 1, 60000);
	const button = expectMouseButton(params.button) ?? "left";
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const waitAfterMs = expectOptionalInt(params.waitAfterMs, 0, 60000) ?? 0;

	const from = await resolvePoint(pi, ctx, state, space, fromX, fromY, timeoutMs);
	if (!from.ok) return from.error;
	const to = await resolvePoint(pi, ctx, state, space, toX, toY, timeoutMs);
	if (!to.ok) return to.error;

	const dragScript = `
async (page) => {
  await page.mouse.move(${JSON.stringify(from.value.x)}, ${JSON.stringify(from.value.y)});
  await page.mouse.down({ button: ${JSON.stringify(button)} });
  const steps = Math.max(2, Math.min(240, Math.ceil(${JSON.stringify(durationMs)} / 16)));
  await page.mouse.move(${JSON.stringify(to.value.x)}, ${JSON.stringify(to.value.y)}, { steps });
  await page.mouse.up({ button: ${JSON.stringify(button)} });
  return "ok";
}
`.trim();
	const action = await runCode(pi, ctx, session.backendCommand, session.sessionName, dragScript, timeoutMs);
	if (!action.ok) {
		return backendError("ACTION_FAILED", "Failed to drag in the game session.", action.result, session.backendCommand);
	}
	if (waitAfterMs > 0) await delay(waitAfterMs);

	return {
		ok: true,
		space,
		button,
		durationMs,
		fromX,
		fromY,
		toX,
		toY,
		resolvedViewportFrom: from.value,
		resolvedViewportTo: to.value,
		waitAfterMs,
	};
}

async function handleGameWait(rawParams: unknown) {
	const params = expectRecord(rawParams);
	const waitMs = expectInt(params.waitMs, "waitMs", 1, 60000);
	await delay(waitMs);
	return {
		ok: true,
		waitedMs: waitMs,
	};
}

async function handleGameStatus(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const backend = await ensureBackend(pi, ctx, state);
	const backendAvailable = backend.ok;
	const backendCommand = backend.ok ? backend.value : state.backendCommand;

	let sessionPingSucceeded = false;
	let runtimeUrl: string | null = null;
	let geometry: GeometryResult | null = null;
	let geometryReadSucceeded = false;
	let consoleStateCheckSucceeded = false;
	let currentMessages: ConsoleMessage[] | null = null;

	if (state.sessionActive && state.sessionName && backendCommand) {
		const ping = await pingSession(pi, ctx, state, timeoutMs);
		sessionPingSucceeded = ping.ok && !!ping.runtimeUrl;
		runtimeUrl = ping.ok ? ping.runtimeUrl : null;

		const geometryResult = await tryReadGeometry(pi, ctx, state, timeoutMs);
		if (geometryResult.ok) {
			geometry = geometryResult.value;
			geometryReadSucceeded = true;
		}

		const consoleCheck = await peekCurrentConsoleMessages(pi, ctx, state, timeoutMs);
		if (consoleCheck.ok) {
			consoleStateCheckSucceeded = true;
			currentMessages = consoleCheck.currentMessages;
		}
	}

	return {
		ok: true,
		backendAvailable,
		backendCommand: backendCommand ? backendDisplay(backendCommand) : null,
		backendCheckSucceeded: backendAvailable,
		sessionPingSucceeded,
		consoleStateCheckSucceeded,
		activeSessionExistsInMemory: state.sessionActive,
		activeSessionAlive: sessionPingSucceeded,
		sessionName: state.sessionName,
		storedUrl: state.url,
		runtimeUrl,
		configuredViewport: state.configuredViewport,
		runtimeViewport: geometry ? geometry.viewport : null,
		devicePixelRatio: geometry ? geometry.devicePixelRatio : null,
		screenshotDirectory: state.screenshotsDir,
		lastScreenshotPath: state.lastScreenshotPath,
		activeCanvasFoundOnLastLiveCheck: geometry ? geometry.activeCanvas !== null : false,
		activeCanvas: geometry ? geometry.activeCanvas : null,
		currentWarningCount: currentMessages ? currentMessages.filter((m) => m.type === "warning").length : null,
		currentErrorCount: currentMessages ? currentMessages.filter((m) => m.type === "error").length : null,
		recentWarningCount: state.consoleRecentRingBuffer.filter((m) => m.type === "warning").length,
		recentErrorCount: state.consoleRecentRingBuffer.filter((m) => m.type === "error").length,
		geometryReadSucceeded,
	};
}

async function handleGameClose(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, rawParams: unknown) {
	const params = expectRecord(rawParams);
	const timeoutMs = expectOptionalInt(params.timeoutMs, 1, 120000) ?? DEFAULT_TIMEOUT_MS;
	const hadActiveSession = state.sessionActive && !!state.sessionName;
	const closedSessionName = state.sessionName;
	if (state.sessionName && state.backendCommand) {
		await bestEffortCloseSession(pi, ctx, state.backendCommand, state.sessionName, timeoutMs);
	}
	clearSessionState(state, { keepBackend: false });
	return {
		ok: true,
		hadActiveSession,
		closedSessionName,
	};
}

async function ensureBackend(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState) {
	if (state.backendCommand) {
		return { ok: true as const, value: state.backendCommand };
	}

	const candidates: BackendCommand[] = [
		{ mode: "playwright-cli", command: "playwright-cli", baseArgs: [] },
		{ mode: "npx playwright-cli", command: "npx", baseArgs: ["--no-install", "playwright-cli"] },
	];

	for (const candidate of candidates) {
		try {
			const result = (await pi.exec(candidate.command, [...candidate.baseArgs, "--version"], {
				timeout: 3_000,
				cwd: ctx.cwd,
			})) as ExecResult;
			if (result.code === 0) {
				state.backendCommand = candidate;
				return { ok: true as const, value: candidate };
			}
		} catch {
			// Try next backend candidate.
		}
	}

	return {
		ok: false as const,
		error: {
			ok: false,
			code: "BACKEND_NOT_AVAILABLE",
			error: "Playwright CLI is not available. Install `playwright-cli` or make `npx playwright-cli` available in this project.",
		},
	};
}

async function runBackend(
	pi: ExtensionAPI,
	ctx: ToolCtx,
	backend: BackendCommand,
	sessionName: string | null,
	args: string[],
	timeoutMs: number
) {
	const fullArgs = [...backend.baseArgs];
	if (sessionName) fullArgs.push(`-s=${sessionName}`);
	fullArgs.push(...args);
	try {
		const result = (await pi.exec(backend.command, fullArgs, {
			timeout: timeoutMs,
			cwd: ctx.cwd,
		})) as ExecResult;
		return { ok: result.code === 0, result };
	} catch (error) {
		return {
			ok: false,
			result: {
				code: -1,
				stdout: "",
				stderr: error instanceof Error ? error.message : String(error),
			} satisfies ExecResult,
		};
	}
}

async function runCode(
	pi: ExtensionAPI,
	ctx: ToolCtx,
	backend: BackendCommand,
	sessionName: string,
	code: string,
	timeoutMs: number
) {
	return runBackend(pi, ctx, backend, sessionName, ["run-code", code], timeoutMs);
}

async function pingSession(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, timeoutMs: number) {
	const session = ensureSession(state);
	if (!session.ok) return { ok: false as const };
	const result = await runBackend(
		pi,
		ctx,
		session.backendCommand,
		session.sessionName,
		["eval", "() => window.location.href"],
		timeoutMs
	);
	if (!result.ok) return { ok: false as const };
	const runtimeUrl = extractUrlFromOutput(result.result.stdout);
	return { ok: true as const, runtimeUrl: runtimeUrl || null };
}

async function tryReadGeometry(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, timeoutMs: number) {
	const session = ensureSession(state);
	if (!session.ok) return session;
	return tryReadGeometryWithBackend(pi, ctx, session.backendCommand, session.sessionName, timeoutMs);
}

async function tryReadGeometryWithBackend(
	pi: ExtensionAPI,
	ctx: ToolCtx,
	backend: BackendCommand,
	sessionName: string,
	timeoutMs: number
) {
	const result = await runCode(pi, ctx, backend, sessionName, geometryScript, timeoutMs);
	if (!result.ok) {
		return {
			ok: false as const,
			error: backendError("GEOMETRY_READ_FAILED", "Failed to read page or canvas geometry.", result.result, backend),
		};
	}
	const parsed = parseJsonOutput<GeometryResult>(result.result.stdout);
	if (!parsed) {
		return {
			ok: false as const,
			error: {
				ok: false,
				code: "GEOMETRY_READ_FAILED",
				error: "Failed to parse geometry output from Playwright CLI.",
			},
		};
	}
	return { ok: true as const, value: parsed };
}

async function readCurrentConsoleMessages(
	pi: ExtensionAPI,
	ctx: ToolCtx,
	state: SessionState,
	timeoutMs: number,
	clearAfterRead: boolean
) {
	const session = ensureSession(state);
	if (!session.ok) return session;
	const result = await runBackend(pi, ctx, session.backendCommand, session.sessionName, ["console", "warning"], timeoutMs);
	if (!result.ok) {
		return {
			ok: false as const,
			error: backendError("CONSOLE_READ_FAILED", "Failed to read current warning/error console messages.", result.result, session.backendCommand),
		};
	}
	const currentMessages = parseConsoleMessages(result.result.stdout);
	pushRecentMessages(state, currentMessages);
	let consoleCleared = false;
	if (clearAfterRead) {
		const clear = await runBackend(pi, ctx, session.backendCommand, session.sessionName, ["console", "--clear"], timeoutMs);
		consoleCleared = clear.ok;
	}
	return {
		ok: true as const,
		currentMessages,
		consoleCleared,
	};
}

async function peekCurrentConsoleMessages(pi: ExtensionAPI, ctx: ToolCtx, state: SessionState, timeoutMs: number) {
	const session = ensureSession(state);
	if (!session.ok) return session;
	const result = await runBackend(pi, ctx, session.backendCommand, session.sessionName, ["console", "warning"], timeoutMs);
	if (!result.ok) {
		return {
			ok: false as const,
			error: backendError("STATUS_CHECK_FAILED", "Failed to inspect current console state.", result.result, session.backendCommand),
		};
	}
	return {
		ok: true as const,
		currentMessages: parseConsoleMessages(result.result.stdout),
	};
}

async function resolvePoint(
	pi: ExtensionAPI,
	ctx: ToolCtx,
	state: SessionState,
	space: "viewport" | "canvas",
	x: number,
	y: number,
	timeoutMs: number
) {
	if (space === "viewport") {
		const viewport = state.configuredViewport;
		if (!viewport) {
			return { ok: false as const, error: noSessionError() };
		}
		validateViewportPoint(x, y, viewport);
		return { ok: true as const, value: { x, y } };
	}

	const geometry = await tryReadGeometry(pi, ctx, state, timeoutMs);
	if (!geometry.ok) return geometry;
	if (!geometry.value.activeCanvas) {
		return {
			ok: false as const,
			error: {
				ok: false,
				code: "CANVAS_NOT_FOUND",
				error: "No active visible canvas was detected for a canvas-relative action.",
			},
		};
	}

	validateCanvasPoint(x, y, geometry.value.activeCanvas);
	return {
		ok: true as const,
		value: {
			x: geometry.value.activeCanvas.x + x,
			y: geometry.value.activeCanvas.y + y,
		},
	};
}

function validateViewportPoint(x: number, y: number, viewport: ViewportSize) {
	if (x < 0 || x > viewport.width || y < 0 || y > viewport.height) {
		throwInvalidArgument("Viewport coordinates are outside the configured viewport bounds.");
	}
}

function validateCanvasPoint(x: number, y: number, canvas: CanvasInfo) {
	if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
		throwInvalidArgument("Canvas coordinates are outside the active canvas bounds.");
	}
}

async function cleanupScreenshots(state: SessionState) {
	const absoluteDir = path.join(state.projectRoot || process.cwd(), state.screenshotsDir);
	await fs.mkdir(absoluteDir, { recursive: true });
	const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
	const now = Date.now();
	const files = await Promise.all(
		entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
			.map(async (entry) => {
				const fullPath = path.join(absoluteDir, entry.name);
				const stat = await fs.stat(fullPath);
				return { name: entry.name, fullPath, mtimeMs: stat.mtimeMs };
			})
	);

	const stale = files.filter((file) => now - file.mtimeMs > SCREENSHOT_TTL_MS);
	for (const file of stale) {
		await fs.rm(file.fullPath, { force: true });
	}

	const fresh = files
		.filter((file) => now - file.mtimeMs <= SCREENSHOT_TTL_MS)
		.sort((a, b) => b.mtimeMs - a.mtimeMs);
	for (const file of fresh.slice(SCREENSHOT_RETENTION_COUNT)) {
		await fs.rm(file.fullPath, { force: true });
	}
}

function createSessionName(cwd: string) {
	const base = path.basename(cwd).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
	return `game-${base}-${crypto.randomBytes(3).toString("hex")}`;
}

function setSessionState(
	state: SessionState,
	next: Pick<SessionState, "projectRoot" | "sessionName" | "backendCommand" | "url" | "configuredViewport">
) {
	state.projectRoot = next.projectRoot;
	state.sessionName = next.sessionName;
	state.backendCommand = next.backendCommand;
	state.url = next.url;
	state.configuredViewport = next.configuredViewport;
	state.snapshotCounter = 0;
	state.consoleRecentRingBuffer = [];
	state.sessionActive = true;
	state.lastScreenshotPath = null;
}

function clearSessionState(state: SessionState, options: { keepBackend: boolean }) {
	state.sessionName = null;
	state.url = null;
	state.configuredViewport = null;
	state.snapshotCounter = 0;
	state.consoleRecentRingBuffer = [];
	state.sessionActive = false;
	state.lastScreenshotPath = null;
	if (!options.keepBackend) {
		state.backendCommand = null;
	}
}

async function closeActiveSession(pi: ExtensionAPI, state: SessionState, timeoutMs = 5_000) {
	if (!state.sessionName || !state.backendCommand || !state.projectRoot) return;
	try {
		await pi.exec(
			state.backendCommand.command,
			[...state.backendCommand.baseArgs, `-s=${state.sessionName}`, "close"],
			{ timeout: timeoutMs, cwd: state.projectRoot }
		);
	} catch {
		// Best effort only.
	}
}

async function bestEffortCloseSession(
	pi: ExtensionAPI,
	ctx: ToolCtx,
	backend: BackendCommand,
	sessionName: string,
	timeoutMs = 5_000
) {
	try {
		await runBackend(pi, ctx, backend, sessionName, ["close"], timeoutMs);
	} catch {
		// Best effort only.
	}
}

function backendError(code: ErrorCode, error: string, result: ExecResult, backend: BackendCommand) {
	return {
		ok: false,
		code,
		error,
		details: {
			backendMode: backend.mode,
			exitCode: result.code,
			stderrSnippet: truncate(result.stderr || result.stdout, MAX_STDERR_SNIPPET),
		},
	};
}

function pushRecentMessages(state: SessionState, messages: ConsoleMessage[]) {
	if (messages.length === 0) return;
	state.consoleRecentRingBuffer.push(...messages);
	if (state.consoleRecentRingBuffer.length > state.consoleRecentRingLimit) {
		state.consoleRecentRingBuffer.splice(0, state.consoleRecentRingBuffer.length - state.consoleRecentRingLimit);
	}
}

function parseConsoleMessages(stdout: string): ConsoleMessage[] {
	const lines = stdout.split(/\r?\n/);
	const messages: ConsoleMessage[] = [];
	let current: ConsoleMessage | null = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || isPlaywrightCliMetaLine(line)) {
			continue;
		}
		const header = line.match(/^\[(warning|error)\]\s*(.*)$/i);
		if (header) {
			if (current) messages.push(current);
			current = {
				type: header[1].toLowerCase() as "warning" | "error",
				text: header[2] || "",
				timestamp: Date.now(),
			};
			continue;
		}

		const location = line.match(/^at\s+(.+?):(\d+):(\d+)$/);
		if (location && current) {
			current.location = {
				url: location[1],
				line: Number(location[2]),
				column: Number(location[3]),
			};
			continue;
		}

		if (current && line) {
			current.text = current.text ? `${current.text}\n${line}` : line;
		}
	}

	if (current) messages.push(current);
	return messages;
}

function parseJsonOutput<T>(stdout: string): T | null {
	const trimmed = stdout.trim();
	if (!trimmed) return null;

	const candidates = [trimmed, extractJsonSlice(trimmed)].filter(Boolean) as string[];
	for (const candidate of candidates) {
		try {
			return JSON.parse(candidate) as T;
		} catch {
			// Keep trying.
		}
	}

	const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		try {
			return JSON.parse(lines[index] as string) as T;
		} catch {
			// Keep trying.
		}
	}

	return null;
}

function extractJsonSlice(text: string) {
	const objectStart = text.indexOf("{");
	const objectEnd = text.lastIndexOf("}");
	if (objectStart !== -1 && objectEnd > objectStart) {
		return text.slice(objectStart, objectEnd + 1);
	}
	const arrayStart = text.indexOf("[");
	const arrayEnd = text.lastIndexOf("]");
	if (arrayStart !== -1 && arrayEnd > arrayStart) {
		return text.slice(arrayStart, arrayEnd + 1);
	}
	return null;
}

function expectRecord(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throwInvalidArgument("Expected an object input.");
	}
	return value as Record<string, unknown>;
}

function expectLocalUrl(value: unknown) {
	const stringValue = expectString(value, 1);
	let parsed: URL;
	try {
		parsed = new URL(stringValue);
	} catch {
		throwInvalidUrl("Expected a valid URL.");
	}
	if (!LOCAL_HOSTS.has(parsed.hostname)) {
		throwInvalidUrl("Only local URLs on localhost, 127.0.0.1, or ::1 are allowed.");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throwInvalidUrl("Only http and https URLs are allowed.");
	}
	return parsed.toString();
}

function expectViewport(value: unknown): ViewportSize {
	const record = expectRecord(value);
	return {
		width: expectInt(record.width, "viewport.width", 100, 4000),
		height: expectInt(record.height, "viewport.height", 100, 4000),
	};
}

function expectString(value: unknown, minLength = 0) {
	if (typeof value !== "string" || value.length < minLength) {
		throwInvalidArgument("Expected a non-empty string.");
	}
	return value;
}

function expectFiniteNumber(value: unknown, name: string) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throwInvalidArgument(`Expected \`${name}\` to be a finite number.`);
	}
	return value;
}

function expectInt(value: unknown, name: string, min: number, max: number) {
	if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
		throwInvalidArgument(`Expected \`${name}\` to be an integer in range ${min}..${max}.`);
	}
	return value;
}

function expectOptionalInt(value: unknown, min: number, max: number) {
	if (value === undefined) return undefined;
	return expectInt(value, "value", min, max);
}

function expectSpace(value: unknown) {
	if (value !== "viewport" && value !== "canvas") {
		throwInvalidArgument("Expected `space` to be `viewport` or `canvas`.");
	}
	return value;
}

function expectMouseButton(value: unknown) {
	if (value === undefined) return undefined;
	if (value !== "left" && value !== "middle" && value !== "right") {
		throwInvalidArgument("Expected `button` to be `left`, `middle`, or `right`.");
	}
	return value;
}

function expectClickCount(value: unknown) {
	if (value === undefined) return undefined;
	if (value !== 1 && value !== 2) {
		throwInvalidArgument("Expected `clickCount` to be 1 or 2.");
	}
	return value;
}

function expectKeyMode(value: unknown) {
	if (value === undefined) return undefined;
	if (value !== "press" && value !== "down" && value !== "up") {
		throwInvalidArgument("Expected `mode` to be `press`, `down`, or `up`.");
	}
	return value;
}

function ensureSession(state: SessionState) {
	if (!state.sessionActive || !state.sessionName || !state.backendCommand) {
		return { ok: false as const, error: noSessionError() };
	}
	return {
		ok: true as const,
		sessionName: state.sessionName,
		backendCommand: state.backendCommand,
	};
}

function noSessionError() {
	return {
		ok: false,
		code: "NO_SESSION",
		error: "No active game session exists. Call `game_open` first.",
	};
}

function normalizeThrownError(error: unknown) {
	const maybeCode = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : undefined;
	const message = error instanceof Error ? error.message : String(error);
	if (maybeCode === "INVALID_ARGUMENT" || maybeCode === "INVALID_URL") {
		return {
			ok: false,
			code: maybeCode,
			error: message,
		};
	}
	return {
		ok: false,
		code: "ACTION_FAILED",
		error: message || "Unexpected extension error.",
	};
}

function throwInvalidArgument(message: string): never {
	const error = new Error(message) as Error & { code?: ErrorCode };
	error.code = "INVALID_ARGUMENT";
	throw error;
}

function throwInvalidUrl(message: string): never {
	const error = new Error(message) as Error & { code?: ErrorCode };
	error.code = "INVALID_URL";
	throw error;
}

function truncate(text: string, maxLength: number) {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength);
}

function extractUrlFromOutput(stdout: string) {
	const lines = stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	for (const line of lines) {
		if (/^https?:\/\//i.test(line)) {
			return line;
		}
		const pageUrlMatch = line.match(/^Page URL:\s*(https?:\/\/\S+)$/i);
		if (pageUrlMatch) {
			return pageUrlMatch[1];
		}
	}
	return lines.at(-1);
}

function timestampForFilename(date: Date) {
	return date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "");
}

function sameViewport(left: ViewportSize | null, right: ViewportSize | null) {
	if (!left || !right) return false;
	return left.width === right.width && left.height === right.height;
}

function backendDisplay(backend: BackendCommand) {
	return backend.mode === "playwright-cli" ? "playwright-cli" : "npx playwright-cli";
}

async function delay(ms: number) {
	if (ms <= 0) return;
	await new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlaywrightCliMetaLine(line: string) {
	return (
		line.startsWith("### ") ||
		line.startsWith("[Snapshot]") ||
		line.startsWith("Page URL:") ||
		line.startsWith("Page Title:") ||
		line.startsWith("Snapshot saved to ") ||
		line.startsWith("Screenshot saved to ")
	);
}
