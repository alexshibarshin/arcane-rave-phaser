import type { IRenderable } from '../types/index.js';

/**
 * Пул объектов для runtime-объектов с частым lifecycle churn.
 *
 * Scaffold использует разделение на активные и свободные экземпляры, чтобы
 * update() всегда проходил только по объектам, участвующим в кадре.
 */
export class ObjectPool<T extends IRenderable> {
  private readonly available: T[] = [];
  private readonly active = new Set<T>();
  private readonly factory: () => T;
  private readonly maxSize: number;
  private totalCount = 0;

  constructor(factory: () => T, options?: { maxSize?: number }) {
    this.factory = factory;
    this.maxSize = options?.maxSize ?? 100;
  }

  /**
   * Получить объект из пула. Если свободных экземпляров нет, создаёт новый до
   * достижения лимита.
   */
  get(x: number, y: number): T | undefined {
    let entity = this.available.pop();

    if (!entity) {
      if (this.totalCount >= this.maxSize) {
        return undefined;
      }

      entity = this.factory();
      this.totalCount += 1;
    }

    entity.spawn(x, y);
    this.active.add(entity);
    return entity;
  }

  release(entity: T): void {
    if (!this.active.has(entity)) {
      return;
    }

    this.active.delete(entity);
    entity.despawn();
    this.available.push(entity);
  }

  update(delta: number): void {
    for (const entity of this.active) {
      entity.update(delta);
    }
  }

  getAllActive(): T[] {
    return [...this.active];
  }

  clear(): void {
    for (const entity of this.active) {
      entity.despawn();
    }

    for (const entity of this.available) {
      entity.despawn();
    }

    this.active.clear();
    this.available.length = 0;
    this.totalCount = 0;
  }

  get size(): number {
    return this.totalCount;
  }

  get availableCount(): number {
    return this.available.length;
  }

  get activeCount(): number {
    return this.active.size;
  }
}
