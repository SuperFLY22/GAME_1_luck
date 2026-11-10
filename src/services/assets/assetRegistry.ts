import { ASSET_PATHS } from '../../config/constants';
import type { DamageLevel } from '../../models/types';

type Listener = () => void;

class AssetRegistry {
  private availableImages: Set<string> = new Set();
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * 애플리케이션 기동 시 백그라운드에서 `/public/assets` 내 사용자 커스텀 이미지 존재 여부 프로브
   */
  public async probeCustomAssets(): Promise<void> {
    const probeUrls: string[] = [];
    for (let i = 0; i <= 5; i++) {
      probeUrls.push(`${ASSET_PATHS.IMAGES.P1_BASE}${i}.png`);
      probeUrls.push(`${ASSET_PATHS.IMAGES.P2_BASE}${i}.png`);
    }

    await Promise.all(
      probeUrls.map((url) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            this.availableImages.add(url);
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = url;
        });
      })
    );

    this.notify();
  }

  public hasCustomImage(playerId: 'p1' | 'p2', damage: DamageLevel): boolean {
    const base = playerId === 'p1' ? ASSET_PATHS.IMAGES.P1_BASE : ASSET_PATHS.IMAGES.P2_BASE;
    return this.availableImages.has(`${base}${damage}.png`);
  }

  public getCustomImageUrl(playerId: 'p1' | 'p2', damage: DamageLevel): string {
    const base = playerId === 'p1' ? ASSET_PATHS.IMAGES.P1_BASE : ASSET_PATHS.IMAGES.P2_BASE;
    return `${base}${damage}.png`;
  }
}

export const assetRegistry = new AssetRegistry();
