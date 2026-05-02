/**
 * Минимальный контракт для систем, участвующих в frame update pipeline.
 *
 * Конкретный проект может расширять его дополнительными hook-методами или
 * собственными интерфейсами.
 */
export interface SceneSystem {
  update(delta: number): void;
  destroy?(): void;
}
