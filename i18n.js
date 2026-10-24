/* 10Potatoes translations. English fallback; no logo changes. */
(function (root) {
  const supported = ["it", "en", "es", "fr", "de", "pt", "ja", "ko", "zh-CN", "id"];
  const normalize = (value) => {
    const code = String(value || "").replace("_", "-").toLowerCase();
    if (code.startsWith("zh")) return "zh-CN";
    const base = code.split("-")[0];
    return supported.includes(base) ? base : "en";
  };
  let active = "en";
  let messages = {};
  let fallback = {};
  async function load(language) {
    const target = normalize(language || (typeof navigator !== "undefined" ? navigator.language : "en"));
    const [enResponse, selectedResponse] = await Promise.all([
      fetch("./locales/en.json?v=0.22.15"),
      target === "en" ? Promise.resolve(null) : fetch("./locales/" + target + ".json?v=0.22.15")
    ]);
    if (!enResponse.ok) throw new Error("English translations unavailable");
    fallback = await enResponse.json();
    messages = selectedResponse && selectedResponse.ok ? await selectedResponse.json() : fallback;
    active = selectedResponse && !selectedResponse.ok ? "en" : target;
    return active;
  }
  function translate(key, params) {
    const lookup = (obj) => key.split(".").reduce((v, part) => v && v[part], obj);
    const template = lookup(messages) ?? lookup(fallback) ?? key;
    return String(template).replace(/\\{(\\w+)\\}/g, (_, name) => params && params[name] != null ? String(params[name]) : "{" + name + "}");
  }
  root.PotatoesI18n = { supported, normalize, load, t: translate, get language() { return active; } };
})(typeof window !== "undefined" ? window : globalThis);
