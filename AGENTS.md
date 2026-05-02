# AGENTS.md — Game made with Phaser 3

## Описание

Это репозиторий для игры на **Phaser 3 + TypeScript + Vite**.

---

## Структура

```text
{project_folder}/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── index.ts
    ├── config/
    │   ├── GameConfig.ts
    │   └── EntitiesConfig.ts
    ├── events/
    │   └── EventBus.ts
    ├── types/
    │   └── index.ts
    ├── entities/
    │   └── BaseEntity.ts
    ├── systems/
    │   ├── SceneSystem.ts
    │   ├── InputSystem.ts
    │   └── SimulationSystem.ts
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── GameScene.ts
    │   └── UIScene.ts
    ├── render/
    │   └── IRenderer.ts
    └── utils/
        └── ObjectPool.ts
```

---

## Архитектурные принципы

### 1. EventBus — единственный общий канал коммуникации

Системы и сцены обмениваются сигналами через `EventBus`.

Пример нейтрального события:

```ts
emit('scene:ready', { key: this.scene.key });
```

### 2. Все значения runtime-уровня лежат в `config/`

Любые размеры, лимиты, ключи сцен, texture keys, pool capacity и прочие
базовые параметры должны быть вынесены в `src/config/`.

### 3. `GameScene` задаёт fixed update pipeline

Порядок фаз кадра в `GameScene.update()` фиксирован:

```text
1. input systems
2. simulation systems
3. root entities
4. object pools
5. cleanup hooks
```

Если добавляется новая система, нужно явно определить, к какой фазе она
относится. Система не должна зависеть от результатов фаз, идущих после неё.

### 4. `BaseEntity` отвечает только за lifecycle

`BaseEntity` — это общая реализация:

- `init()`
- `spawn()`
- `despawn()`
- создание Phaser GameObject
- lifecycle hooks

Конкретные сущности добавляют только собственное поведение поверх этого.

### 5. `ObjectPool` — только инфраструктура, не доменная логика

Пул должен оставаться полностью универсальным. Он не знает ничего про тип игры
или поведение объектов, кроме общего контракта `IRenderable`.

### 6. Базовые системы должны быть нейтральными extension points

`InputSystem` и `SimulationSystem` в scaffold — это не “готовая игровая логика”,
а места расширения. Они могут быть пустыми по умолчанию.

### 7. Scaffold может зависеть от Phaser, но не должен протаскивать домен игры

Phaser-specific код допустим в сценах, базовых сущностях и engine-adapter
системах. Недопустима привязка scaffold-слоя к конкретным игровым правилам.

---

## Зависимости между слоями

```text
index.ts
  ├── config
  ├── events
  └── scenes

scenes/
  ├── systems
  ├── entities
  ├── utils
  ├── config
  └── events

entities/
  ├── types
  └── config

systems/
  ├── events
  └── Phaser adapters when needed

utils/
  └── types
```

Правило: избегай циклических импортов и не делай зависимости “назад” ради
конкретного gameplay-кейса.

---

## Как расширять scaffold

### Добавление новой сущности

1. Создай класс в `src/entities/`
2. Наследуй его от `BaseEntity`
3. Вынеси scaffold-level конфиги в `src/config/`
4. Зарегистрируй объект в `GameScene` или в наследнике `GameScene`
5. Если объект часто создаётся и удаляется, используй `ObjectPool`

### Добавление новой системы

1. Создай файл в `src/systems/`
2. Реализуй контракт `SceneSystem` или совместимый интерфейс
3. Определи фазу выполнения: input или simulation
4. Подключи систему через `createInputSystems()` или `createSimulationSystems()`
5. Для межсистемной коммуникации используй `EventBus`

### Добавление нового события

1. Добавь тип в `EventMap` в `src/events/EventBus.ts`
2. Используй нейтральные имена для scaffold-level событий
3. Доменные события добавляй только если проект уже перестал быть generic scaffold

### Добавление UI

1. Расширяй `UIScene` или создавай reusable-компоненты рядом с ним
2. Не добавляй scaffold-level текстов, привязанных к сценарию конкретной игры
3. Подписывайся на lifecycle или доменные события через `EventBus`

---

## Валидация

```bash
npx tsc --noEmit
npm run build
npm run test:run
```
