import { CodemagicClient } from './CodemagicClient';
import { MetaInfo } from '../../meta';

export type CodemagicClientFactory = (token: string) => CodemagicClient;

export function getCodemagicClientFactory(meta: MetaInfo): CodemagicClientFactory {
  return (token) => new CodemagicClient(token);
}
