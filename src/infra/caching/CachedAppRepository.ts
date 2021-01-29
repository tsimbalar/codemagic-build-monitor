import { App, IAppRepository } from '../../domain/IAppRepository';
import LRUCache from 'lru-cache';
import { createHash } from 'crypto';

export class CachedAppRepository implements IAppRepository {
  public constructor(
    private readonly cache: LRUCache<string, any>,
    private readonly wrapped: IAppRepository
  ) {}

  public async listForToken(token: string): Promise<ReadonlyArray<App>> {
    const tokenHash = createHash('sha1').update(token).digest('base64');
    const uriEscapedTokenHash = encodeURIComponent(tokenHash);
    const cacheKey = `token("${uriEscapedTokenHash}")/apps`;
    const existing = this.cache.get(cacheKey);
    if (existing !== undefined) {
      return existing as ReadonlyArray<App>;
    }

    const actual = await this.wrapped.listForToken(token);
    this.cache.set(cacheKey, actual, 60 * 1000);
    return actual;
  }
}
