import { CodeMagicClient } from './CodeMagicClient';
import { MetaInfo } from '../../meta';

export type CodeMagicClientFactory = (token: string) => CodeMagicClient;

export function getCodeMagicClientFactory(meta: MetaInfo): CodeMagicClientFactory {
  return (token) => new CodeMagicClient(token);
}
