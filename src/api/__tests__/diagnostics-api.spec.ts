import { ApiTestTools, TestAgent } from '../__testTools__/ApiTestTools';
import { HealthCheckResponse } from '../api-types';

describe('Public API /_/* (diagnostics)', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = ApiTestTools.createTestAgent();
  });

  describe('GET /_/healthcheck', () => {
    test('should return expected body with 200 status', async () => {
      const response = await agent.get('/_/healthcheck').send();
      expect(response.status).toBe(200);
      expect(response.type).toBe('application/json');
      expect(response.body).toEqual<HealthCheckResponse>({
        version: expect.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+/u),
        buildInfo: expect.objectContaining({
          commitSha: expect.stringContaining(''),
          buildDate: expect.stringContaining(''),
          gitRef: expect.stringContaining(''),
        }),
      });
    });
  });
});
