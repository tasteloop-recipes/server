import { AppService } from './app.service';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(async () => {
    appService = new AppService();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appService.getHello()).toBe('Hello World!');
    });

    it('should always return the same string', () => {
      const result1 = appService.getHello();
      const result2 = appService.getHello();
      expect(result1).toEqual(result2);
    });

    it('should return a string', () => {
      const result = appService.getHello();
      expect(typeof result).toBe('string');
    });

    it('should return non-empty string', () => {
      const result = appService.getHello();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
