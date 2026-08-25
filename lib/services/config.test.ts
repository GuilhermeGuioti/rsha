describe("bootstrap do projeto", () => {
  it("roda no Jest com o .env.test carregado", () => {
    expect(process.env.DATABASE_URL).toContain("srha_test");
    expect(process.env.DIRECT_URL).toContain("srha_test");
  });
});
