import { isCompanyEmail, COMPANY_EMAIL_DOMAIN } from "../emailDomain";

describe("isCompanyEmail", () => {
  it("accepts visilean.com addresses (case/space-insensitive)", () => {
    expect(isCompanyEmail("alex@visilean.com")).toBe(true);
    expect(isCompanyEmail("  Alex@VisiLean.com ")).toBe(true);
    expect(COMPANY_EMAIL_DOMAIN).toBe("visilean.com");
  });

  it("rejects other domains and malformed addresses", () => {
    expect(isCompanyEmail("alex@gmail.com")).toBe(false);
    expect(isCompanyEmail("alex@sub.visilean.com")).toBe(false);
    expect(isCompanyEmail("alex@notvisilean.com")).toBe(false);
    expect(isCompanyEmail("alex@visilean.com.evil.com")).toBe(false);
    expect(isCompanyEmail("@visilean.com")).toBe(false);
    expect(isCompanyEmail("alexvisilean.com")).toBe(false);
    expect(isCompanyEmail("a@b@visilean.com")).toBe(false);
  });
});
