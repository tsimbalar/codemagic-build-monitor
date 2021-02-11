import { App } from '../../../domain/IAppRepository';
import { CachedAppRepository } from '../CachedAppRepository';
import { InMemoryAppRepository } from '../../memory/InMemoryAppRepository';
import LRUCache from 'lru-cache';
import MockDate from 'mockdate';

describe('CachedAppRepository', () => {
  describe('listForToken', () => {
    afterEach(() => {
      MockDate.reset();
    });

    test('should returned apps of wrapped repo', async () => {
      const existingApp: App = {
        id: 'app-id',
        name: 'app-name',
        webUrl: 'http://www.perdu.com',
        workflows: [],
      };
      const token1 = 'token';
      const wrapped = new InMemoryAppRepository();
      wrapped.addApp(token1, existingApp);

      const sut = new CachedAppRepository(new LRUCache<string, any>(), wrapped);

      const actual = await sut.listForToken(token1);

      expect(actual).toEqual([existingApp]);
    });

    test('should cache during 1 minute', async () => {
      const token = 'tokenZ';
      const wrapped = new InMemoryAppRepository();

      const spy = jest.spyOn(wrapped, 'listForToken');
      const sut = new CachedAppRepository(new LRUCache<string, any>(), wrapped);

      const actual1 = await sut.listForToken(token);
      expect(spy).toHaveBeenCalledTimes(1);

      // a new app has been added ... but we are still hitting the cache
      const existingApp: App = {
        id: 'app-id',
        name: 'app name',
        webUrl: 'http://www.perdu.com',
        workflows: [],
      };
      wrapped.addApp(token, existingApp);

      const actual2 = await sut.listForToken(token);
      expect(actual2).toEqual(actual1);
      expect(spy).toHaveBeenCalledTimes(1);

      const after1Minute = new Date();
      after1Minute.setTime(after1Minute.getTime() + 1000 * 60 + 1);
      MockDate.set(after1Minute);
      // cache has expired
      const actual3 = await sut.listForToken(token);
      expect(actual3).not.toEqual(actual2);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    test('should cache per token', async () => {
      const token1 = 'token';
      const token2 = 'token2';
      const wrapped = new InMemoryAppRepository();
      // a new app has been added ... but we are still hitting the cache
      const existingApp11: App = {
        id: 'app1',
        name: 'app1-name',
        webUrl: 'http://www.perdu.com',
        workflows: [],
      };
      wrapped.addApp(token1, existingApp11);

      const sut = new CachedAppRepository(new LRUCache<string, any>(), wrapped);

      const actualForToken1 = await sut.listForToken(token1);

      const actualForToken2 = await sut.listForToken(token2);
      expect(actualForToken2).not.toEqual(actualForToken1);
    });
  });
});
