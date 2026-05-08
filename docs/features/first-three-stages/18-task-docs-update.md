# Documentation Updates — VISION.md and CONTEXT.md

## Task Intent

Update `VISION.md` and `CONTEXT.md` to reflect the feature's design decisions: same-color weakness (instead of color triangle), the stage selection loop, star rating system, and session-based progress. These documentation changes keep the project's reference files accurate and serve as context for future agents.

After this task, both docs accurately describe the game as implemented after the First Three Stages feature.

## Relevant Context

### VISION.md Changes

The current VISION.md describes:
- A **color triangle** weakness system: red > green, green > blue, blue > red
- No stage selection or lobby
- No star rating system
- No session progress

The implemented game now uses:
- **Same-color weakness**: red beats red, green beats green, blue beats blue (1.5× multiplier)
- A **stage selection loop**: lobby → select stage → play → result → back to lobby
- **Star rating**: 0–3 stars based on remaining base HP after stage completion
- **Session-only progress**: best stars per stage remembered within one browser session

### CONTEXT.md Changes

The CONTEXT.md glossary needs alignment:
- `слабость / weakness`: Change from "Выгодный стихийный матчап, дающий бонусный урон по правилу цветового треугольника" to "Выгодный цветовой матчап, дающий бонусный урон при совпадении цвета пешки и врага"
- Add entries for: лобби (lobby), звезды (stars), результат стейджа (stage result), прогресс сессии (session progress), превью волны (wave preview), тег (tag/pill tag)
- Update `превью стейджа / stage preview` if needed (now shows lobby detail, not a separate screen)

## In Scope

- Update VISION.md section on colors/weakness to describe same-color weakness
- Update VISION.md to describe the stage select loop and star rating
- Update VISION.md to mention session progress (in-memory, resets on reload)
- Update CONTEXT.md weaknesses entry
- Add new CONTEXT.md entries for lobby, stars, stage result, session progress, wave preview, pill tags
- Review both files for any other stale references to old mechanics

## Out of Scope

- Writing new documentation from scratch
- Adding implementation details or architecture docs
- Updating AGENTS.md (unless there are stale references)
- Translating terms (CONTEXT.md is already bilingual)
- Updating VISION.md non-goals or future development sections

## Detailed Requirements

### VISION.md — Section: "Цвета и слабости"

**Current text** (approximate):
```
Базовое правило слабостей — классический треугольник:
- красный сильнее зеленого;
- зеленый сильнее синего;
- синий сильнее красного.
```

**Replace with**:
```
Базовое правило слабостей — совпадение цвета (same-color weakness):
- красный сильнее красного;
- зеленый сильнее зеленого;
- синий сильнее синего.

Пешка наносит бонусный урон (×1.5) врагам того же цвета. Это делает контрпик по 
цвету стейджа значимым решением в build phase: игрок хочет собирать пешки того же 
цвета, что и доминирующий цвет врагов стейджа.
```

Also update the section "Цвета и слабости" if it mentions the triangle in the context of axes — the same-color rule applies to all color axes (pawns, notes, enemies).

### VISION.md — New Section: "Цикл стейджа и результат"

Add a new section after "Цель stage и итог результата" (or merge into it) describing the game loop:

```markdown
## Цикл стейджа и лобби

Игра начинается в `lobby`, где игрок видит три доступных `stage` и выбирает один.

Полный цикл:
1. Игрок видит карточки стейджей с информацией о звездах и лучшем результате
2. Выбирает стейдж, видит его детали (теги, элитный враг, босс)
3. Нажимает Start — начинается `stage run`
4. Проходит все волны или теряет базу
5. После завершения игрок видит результат: победа/поражение, звезды, оставшееся HP
6. Может Retry (новый забег) или Close (вернуться в лобби)

Сессионный прогресс:
- Лучшие звезды за стейдж запоминаются в рамках одной сессии
- Повторное прохождение с лучшим результатом обновляет рекорд
- Поражение (0 звезд) не перезаписывает успешный результат
- Перезагрузка страницы сбрасывает весь прогресс
```

### VISION.md — Update "Цель stage и итог результата"

The star thresholds section is already there. Verify it matches the current implementation:
```
- больше `90%` — `3` звезды;
- от `50%` до `90%` — `2` звезды;
- меньше `50%`, но база выжила — `1` звезда;
- `0 HP` — поражение.
```

This matches. Add a note that thresholds are configurable.

### VISION.md — Update "Как работают enemies и wave"

Add mention that wave composition is **authored per stage** (not randomized) and that enemies now have differentiated archetype stats (basic, fast, tank, swarm) with special elite/boss enemies at waves 5 and 10.

### CONTEXT.md Changes

**Update `слабость / weakness`:**
```
| слабость | weakness | Выгодный цветовой матчап: пешка наносит бонусный урон (×1.5) врагам того же цвета (same-color weakness). |
```

**Add new entries:**

```
| лобби | lobby | Экран выбора стейджа, на котором игрок видит доступные стейджи, их звездный рейтинг и детали, и может начать забег. |
| звезды | stars | Оценка качества прохождения стейджа (0–3) на основе оставшегося здоровья базы. |
| результат стейджа | stage result | Итог завершенного стейджа: победа/поражение, количество звезд, оставшееся HP базы. |
| прогресс сессии | session progress | Лучшие результаты стейджей, сохраненные в памяти на время одной сессии браузера. Сбрасываются при перезагрузке. |
| превью волны | wave preview | Краткое описание состава ближайшей волны (теги, элитный враг) перед ее стартом в build phase. |
| тег | tag / pill tag | Короткая текстовая метка в виде "пилюли", описывающая характеристику стейджа или волны (цвет, тип давления, роль). |
```

## Acceptance Criteria

- [ ] VISION.md color section describes same-color weakness (not triangle)
- [ ] VISION.md has a section describing the lobby → stage → result loop
- [ ] VISION.md mentions star rating and session progress
- [ ] VISION.md has no remaining references to the color triangle weakness
- [ ] CONTEXT.md `слабость/weakness` entry is updated
- [ ] CONTEXT.md has entries for lobby, stars, stage result, session progress, wave preview, tags
- [ ] Both files are internally consistent (no contradictions between VISION and CONTEXT)
- [ ] No unrelated sections were changed

## Technical Notes

- VISION.md is in Russian (with some English keywords). Keep the language consistent.
- CONTEXT.md is a bilingual glossary table. New entries should follow the existing format: `| Русский | English | Значение |`
- Be surgical — only change what's needed. Don't rewrite entire sections.
- If VISION.md has a "Гипотезы для прототипирования" section, leave it — those are still valid hypotheses.
- The "Дальнейшее развитие" section mentions future features. Leave unchanged — this is about future plans, not current implementation.

## Implementation Plan

1. Open `VISION.md`, find the color/weakness section, update it
2. Find or create a section for the stage loop, add lobby/result description
3. Verify star thresholds are correct, add configurable note
4. Scan VISION.md for any other "треугольник" or "triangle" references and update
5. Open `CONTEXT.md`, update the weaknesses entry
6. Add the 6 new glossary entries in alphabetical order (Russian column)
7. Review both files for consistency
8. Run `git diff` to review changes

## Blocked By

None — can start immediately. Documentation-only task, independent of code.

## Type

AFK

## Design Spec Reference

- [Goals — Update VISION.md and CONTEXT.md](../design-spec.md#goals)
- [Color System (Same-Color Weakness)](../design-spec.md#color-system-same-color-weakness)
- [Star Rating](../design-spec.md#star-rating)
- [Gameplay Flow — Main Loop](../design-spec.md#main-loop)
- [Definition of Done — VISION.md and CONTEXT.md updated](../design-spec.md#definition-of-done)
