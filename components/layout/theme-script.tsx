/**
 * Applies the saved theme before first paint so dark mode does not flash.
 *
 * This is the one place the product uses a raw script tag: it must run
 * synchronously in `<head>`, before React hydrates. The content is a fixed
 * string literal with no interpolation, so there is nothing user-controlled in
 * it.
 */
const script = `(function(){try{var t=localStorage.getItem('applypilot-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
