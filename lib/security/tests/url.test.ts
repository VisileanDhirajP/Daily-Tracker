import { sanitizeUrl, isValidUrl } from "../url";

describe("sanitizeUrl", () => {
  it("passes through valid http/https URLs", () => {
    expect(sanitizeUrl("https://github.com/visilean/web-ui/issues/1")).toBe(
      "https://github.com/visilean/web-ui/issues/1",
    );
    expect(sanitizeUrl("http://jira.visilean.com/x")).toBe("http://jira.visilean.com/x");
  });

  it("upgrades scheme-less hosts to https", () => {
    expect(sanitizeUrl("www.example.com/foo")).toBe("https://www.example.com/foo");
    expect(sanitizeUrl("github.com/a/b")).toBe("https://github.com/a/b");
  });

  it("rejects dangerous schemes", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("  JavaScript:alert(1)")).toBeNull();
    expect(sanitizeUrl("java\tscript:alert(1)")).toBeNull();
    expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
    expect(sanitizeUrl("vbscript:msgbox")).toBeNull();
    expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects empty, whitespace and hostless values", () => {
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl("localhost")).toBeNull();
  });

  it("isValidUrl mirrors sanitizeUrl", () => {
    expect(isValidUrl("https://x.com")).toBe(true);
    expect(isValidUrl("javascript:1")).toBe(false);
  });
});
