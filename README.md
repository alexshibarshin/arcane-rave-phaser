# Phaser 3 Scaffold

Базовый scaffold для игры на `Phaser 3 + TypeScript + Vite`.

## Как использовать этот проект как шаблон

Новый проект лучше создавать не через перенос отдельных файлов, а через
копирование всего scaffold целиком, кроме служебных и сгенерированных папок.
Так сохранятся:

- настройки `Vite`
- настройки `TypeScript`
- alias-пути из `tsconfig.json` и `vite.config.ts`
- готовая точка входа
- базовая структура сцен, систем и сущностей

## Что нужно перенести в новую папку

Скопируй в новую директорию:

- `index.html`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `.gitignore`
- `src/`
- `public/`
- `AGENTS.md` при необходимости

## Что переносить не нужно

Не копируй:

- `.git/`
- `node_modules/`
- `dist/`
- `*.tsbuildinfo`
- локальные `.env` файлы, если они относятся только к текущему проекту

## Рекомендуемый порядок создания нового проекта

### 1. Создай новую папку

Пример:

```bash
mkdir my-new-game
```

### 2. Скопируй scaffold в новую папку

Можно сделать это вручную или через `rsync`.

Пример:

```bash
rsync -av \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  /path/to/baseline-phaser-project/ \
  /path/to/my-new-game/
```

### 3. Перейди в новую папку

```bash
cd /path/to/my-new-game
```

### 4. Обнови метаданные проекта

Сразу проверь и при необходимости измени:

- поле `name` в `package.json`
- поле `<title>` в `index.html`
- базовые параметры в `src/config/GameConfig.ts`

## Как правильно установить зависимости

Есть два корректных варианта.

### Вариант 1. Сохранить точные версии зависимостей

Если ты переносишь `package-lock.json`, используй:

```bash
npm ci
```

Это установит зависимости в точных версиях, зафиксированных в lock-файле.

### Вариант 2. Установить зависимости заново

Если `package-lock.json` не переносится, используй:

```bash
npm install
```

После этого будет создан новый `package-lock.json`.

## Как инициализировать новый git-репозиторий

Если новый проект должен жить отдельно:

```bash
git init
git add .
git commit -m "Initial scaffold"
```

## Что проверить после инициализации

### 1. Проверка TypeScript

```bash
npx tsc --noEmit
```

### 2. Проверка production build

```bash
npm run build
```

### 3. Проверка тестового раннера

```bash
npm run test:run
```

### 4. Локальный запуск

```bash
npm run dev
```

Если всё в порядке, Vite поднимет локальный dev-сервер.

## Почему нельзя переносить только `src`

Если скопировать только `src`, новый проект, скорее всего, сломается, потому
что scaffold зависит не только от исходников, но и от конфигурации вокруг них:

- `package.json` содержит зависимости и скрипты
- `tsconfig.json` содержит строгие настройки и alias-пути
- `vite.config.ts` повторяет alias-пути для сборщика
- `index.html` указывает на точку входа `/src/index.ts`

Поэтому `src` без остального окружения не является полностью самостоятельным.

## Что обычно меняют первым делом

После копирования scaffold под новую игру обычно меняют:

- `package.json`
- `index.html`
- `src/config/GameConfig.ts`
- `src/config/EntitiesConfig.ts`
- `src/scenes/BootScene.ts`
- `src/scenes/GameScene.ts`
- `src/scenes/UIScene.ts`

## Быстрый чек-лист

1. Скопировать scaffold без `.git`, `node_modules`, `dist`
2. Переименовать проект в `package.json`
3. Обновить `index.html`
4. Установить зависимости через `npm ci` или `npm install`
5. Запустить `npx tsc --noEmit`
6. Запустить `npm run build`
7. Запустить `npm run test:run`
8. Запустить `npm run dev`
