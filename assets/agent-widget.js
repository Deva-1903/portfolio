/* Floating "Ask my AI" chat widget.
 * Self-contained: injects its own styles + DOM, theme-aware via the site's CSS vars.
 * Talks to the grounded Deva agent (answers only from a verified factbase). */
(function () {
  "use strict";
  if (window.__devaAgentWidget) return;
  window.__devaAgentWidget = true;

  var ENDPOINT = "https://deva-agent.devaanand.workers.dev/chat";

  /* ---------- tiny markdown renderer (bold, italics, code, links, lists) ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(text) {
    var lines = esc(text).split(/\r?\n/), html = "", list = null, m;
    var close = function () { if (list) { html += "</" + list + ">"; list = null; } };
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^([-*_]\s*){3,}$/.test(line)) continue;
      if (!line) { close(); continue; }
      if ((m = line.match(/^#{1,6}\s+(.*)$/))) { close(); html += "<p><strong>" + inline(m[1]) + "</strong></p>"; continue; }
      if ((m = line.match(/^[-*]\s+(.*)$/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += "<li>" + inline(m[1]) + "</li>"; continue; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += "<li>" + inline(m[1]) + "</li>"; continue; }
      close(); html += "<p>" + inline(line) + "</p>";
    }
    close();
    return html;
  }

  /* ---------- styles ---------- */
  var css = `
  .da-launcher{position:fixed;right:20px;bottom:20px;z-index:1000;display:inline-flex;align-items:center;gap:8px;
    padding:11px 16px;border:none;border-radius:999px;cursor:pointer;font-family:var(--font-sans,Inter,sans-serif);
    font-size:14px;font-weight:600;background:var(--text-primary,#111b2b);color:var(--bg-primary,#faf9f6);
    box-shadow:0 6px 22px var(--shadow-medium,rgba(17,27,43,.2));transition:transform .15s ease,box-shadow .15s ease;}
  .da-launcher:hover{transform:translateY(-2px);box-shadow:0 10px 28px var(--shadow-heavy,rgba(17,27,43,.3));}
  .da-launcher .da-dot{width:8px;height:8px;border-radius:50%;background:#39d98a;box-shadow:0 0 0 0 rgba(57,217,138,.6);animation:da-pulse 2s infinite;}
  @keyframes da-pulse{0%{box-shadow:0 0 0 0 rgba(57,217,138,.6);}70%{box-shadow:0 0 0 7px rgba(57,217,138,0);}100%{box-shadow:0 0 0 0 rgba(57,217,138,0);}}

  .da-hint{position:fixed;right:20px;bottom:74px;z-index:1000;max-width:230px;padding:11px 14px;border-radius:14px 14px 4px 14px;
    background:var(--bg-secondary,#fff);color:var(--text-primary,#111b2b);border:1px solid var(--border-medium,#cbd5e0);
    box-shadow:0 8px 24px var(--shadow-medium,rgba(17,27,43,.18));font-family:var(--font-sans,Inter,sans-serif);font-size:13.5px;line-height:1.4;
    opacity:0;transform:translateY(6px);transition:opacity .25s ease,transform .25s ease;pointer-events:none;}
  .da-hint.show{opacity:1;transform:translateY(0);pointer-events:auto;}
  .da-hint b{font-weight:600;}
  .da-hint .da-hint-x{position:absolute;top:4px;right:8px;cursor:pointer;color:var(--text-muted,#718096);font-size:14px;line-height:1;border:none;background:none;}

  .da-panel{position:fixed;right:20px;bottom:20px;z-index:1001;width:370px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 40px);
    display:none;flex-direction:column;overflow:hidden;border-radius:16px;background:var(--bg-primary,#faf9f6);
    border:1px solid var(--border-medium,#cbd5e0);box-shadow:0 16px 48px var(--shadow-heavy,rgba(17,27,43,.3));
    font-family:var(--font-sans,Inter,sans-serif);}
  .da-panel.open{display:flex;animation:da-in .2s ease;}
  @keyframes da-in{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
  .da-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-secondary,#fff);border-bottom:1px solid var(--border-light,#e2e8f0);}
  .da-head h4{margin:0;font-family:var(--font-serif,Outfit,sans-serif);font-size:16px;font-weight:600;color:var(--text-primary,#111b2b);}
  .da-head p{margin:2px 0 0;font-size:11.5px;color:var(--text-muted,#718096);}
  .da-close{border:none;background:none;cursor:pointer;font-size:20px;line-height:1;color:var(--text-muted,#718096);padding:2px 6px;border-radius:6px;}
  .da-close:hover{background:var(--bg-tertiary,#f2f0eb);}
  .da-head-btns{display:flex;align-items:center;gap:2px;}
  .da-expand{border:none;background:none;cursor:pointer;font-size:14px;line-height:1;color:var(--text-muted,#718096);padding:5px 7px;border-radius:6px;}
  .da-expand:hover{background:var(--bg-tertiary,#f2f0eb);}
  .da-panel.expanded{width:760px;height:calc(100vh - 40px);}
  .da-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:4px;}
  .da-meta{font-size:11px;color:var(--text-muted,#718096);margin:6px 4px 0;}
  .da-msg{padding:10px 13px;border-radius:12px;font-size:14px;line-height:1.5;max-width:88%;word-wrap:break-word;}
  .da-bot{background:var(--bg-tertiary,#f2f0eb);color:var(--text-primary,#111b2b);align-self:flex-start;}
  .da-user{background:var(--text-primary,#111b2b);color:var(--bg-primary,#faf9f6);align-self:flex-end;white-space:pre-wrap;}
  .da-bot p{margin:.4em 0;}.da-bot p:first-child{margin-top:0;}.da-bot p:last-child{margin-bottom:0;}
  .da-bot ul,.da-bot ol{margin:.4em 0;padding-left:1.2em;}.da-bot li{margin:.15em 0;}
  .da-bot code{background:var(--bg-secondary,#fff);padding:1px 5px;border-radius:4px;font-size:.9em;}
  .da-bot a{color:var(--accent-blue,#111b2b);}
  .da-typing{display:inline-flex;gap:5px;align-items:center;}
  .da-typing i{width:7px;height:7px;border-radius:50%;background:var(--text-muted,#718096);display:inline-block;animation:da-bounce 1.2s infinite ease-in-out;}
  .da-typing i:nth-child(2){animation-delay:.15s;}.da-typing i:nth-child(3){animation-delay:.3s;}
  @keyframes da-bounce{0%,80%,100%{transform:translateY(0);opacity:.4;}40%{transform:translateY(-5px);opacity:1;}}
  .da-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border-light,#e2e8f0);background:var(--bg-secondary,#fff);}
  .da-form input{flex:1;padding:10px 12px;border:1px solid var(--border-medium,#cbd5e0);border-radius:10px;font-size:14px;
    font-family:inherit;background:var(--bg-primary,#faf9f6);color:var(--text-primary,#111b2b);}
  .da-form input:focus{outline:none;border-color:var(--text-primary,#111b2b);}
  .da-form button{border:none;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px;font-weight:600;
    background:var(--text-primary,#111b2b);color:var(--bg-primary,#faf9f6);min-width:60px;}
  .da-form button:disabled{opacity:.5;cursor:default;}
  .da-suggest{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
  .da-suggest button{font-family:inherit;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;
    border:1px solid var(--border-medium,#cbd5e0);background:transparent;color:var(--text-secondary,#4a5568);}
  .da-suggest button:hover{background:var(--bg-tertiary,#f2f0eb);}
  @media (max-width:480px){.da-panel{right:8px;left:8px;width:auto;bottom:8px;height:calc(100vh - 16px);}.da-launcher{right:12px;bottom:12px;}}
  `;
  var style = document.createElement("style");
  style.id = "da-agent-style";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  var launcher = document.createElement("button");
  launcher.className = "da-launcher";
  launcher.setAttribute("aria-label", "Chat with Deva's AI");
  launcher.innerHTML = '<span class="da-dot"></span><i class="fa-solid fa-comment-dots"></i> Ask my AI';

  var hint = document.createElement("div");
  hint.className = "da-hint";
  hint.innerHTML = '<button class="da-hint-x" aria-label="dismiss">&times;</button>' +
    '👋 <b>New:</b> chat with my AI to learn more about me, it only shares verified facts.';

  var panel = document.createElement("div");
  panel.className = "da-panel";
  panel.innerHTML =
    '<div class="da-head"><div><h4>Ask Deva</h4><p>AI that answers from verified facts about me</p></div>' +
    '<div class="da-head-btns"><button class="da-expand" aria-label="expand chat"><i class="fa-solid fa-expand"></i></button>' +
    '<button class="da-close" aria-label="close">&times;</button></div></div>' +
    '<div class="da-log"></div>' +
    '<form class="da-form"><input type="text" autocomplete="off" placeholder="Ask about my experience or projects…"/>' +
    '<button type="submit">Send</button></form>';

  document.body.appendChild(hint);
  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  var log = panel.querySelector(".da-log");
  var form = panel.querySelector(".da-form");
  var input = form.querySelector("input");
  var sendBtn = form.querySelector("button");
  var history = [];
  var greeted = false;

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function addUser(text) {
    var meta = document.createElement("div"); meta.className = "da-meta"; meta.textContent = "you";
    var m = document.createElement("div"); m.className = "da-msg da-user"; m.textContent = text;
    log.appendChild(meta); log.appendChild(m); scrollDown();
  }
  function addBot(htmlContent) {
    var meta = document.createElement("div"); meta.className = "da-meta"; meta.textContent = "Ava";
    var m = document.createElement("div"); m.className = "da-msg da-bot"; m.innerHTML = htmlContent;
    log.appendChild(meta); log.appendChild(m); scrollDown(); return m;
  }
  function addThinking() {
    var meta = document.createElement("div"); meta.className = "da-meta"; meta.textContent = "Ava";
    var m = document.createElement("div"); m.className = "da-msg da-bot";
    m.innerHTML = '<span class="da-typing"><i></i><i></i><i></i></span>';
    log.appendChild(meta); log.appendChild(m); scrollDown(); return m;
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    addBot("Hi! I'm Ava, Deva's AI assistant. Ask me anything about his experience, skills, or projects.");
    var wrap = document.createElement("div");
    wrap.className = "da-suggest";
    ["What's Deva's background?", "Show me his projects", "What's he strongest at?"].forEach(function (q) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = q;
      b.addEventListener("click", function () { wrap.remove(); send(q); });
      wrap.appendChild(b);
    });
    log.appendChild(wrap); scrollDown();
  }

  async function send(text) {
    text = (text || "").trim(); if (!text) return;
    addUser(text); history.push({ role: "user", content: text });
    input.value = ""; sendBtn.disabled = true; sendBtn.textContent = "…";
    var bubble = addThinking();
    try {
      var r = await fetch(ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });
      var data = await r.json();
      var reply = data.reply || data.error || "(no response)";
      bubble.innerHTML = md(reply);
      history.push({ role: "assistant", content: reply });
    } catch (e) {
      bubble.textContent = "Sorry, I couldn't reach the assistant. Try again in a moment.";
    }
    sendBtn.disabled = false; sendBtn.textContent = "Send"; scrollDown();
    if (panel.classList.contains("open")) input.focus();
  }

  function openPanel() {
    hint.classList.remove("show");
    panel.classList.add("open");
    greet();
    setTimeout(function () { input.focus(); }, 50);
  }
  function closePanel() { panel.classList.remove("open"); }

  launcher.addEventListener("click", function () {
    panel.classList.contains("open") ? closePanel() : openPanel();
  });
  panel.querySelector(".da-close").addEventListener("click", closePanel);

  var expandBtn = panel.querySelector(".da-expand");
  function setExpanded(on) {
    panel.classList.toggle("expanded", on);
    expandBtn.innerHTML = on
      ? '<i class="fa-solid fa-compress"></i>'
      : '<i class="fa-solid fa-expand"></i>';
    expandBtn.setAttribute("aria-label", on ? "shrink chat" : "expand chat");
    try { localStorage.setItem("daExpanded", on ? "1" : "0"); } catch (e) {}
    scrollDown();
  }
  expandBtn.addEventListener("click", function () {
    setExpanded(!panel.classList.contains("expanded"));
  });
  try { if (localStorage.getItem("daExpanded") === "1") setExpanded(true); } catch (e) {}
  hint.addEventListener("click", function (e) {
    if (e.target.classList.contains("da-hint-x")) { hint.classList.remove("show"); dismissHint(); return; }
    openPanel(); dismissHint();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

  /* one-time hint so visitors notice the agent */
  function hintDismissed() { try { return localStorage.getItem("daHintSeen") === "1"; } catch (e) { return false; } }
  function dismissHint() { try { localStorage.setItem("daHintSeen", "1"); } catch (e) {} }
  if (!hintDismissed()) {
    setTimeout(function () {
      if (!panel.classList.contains("open")) { hint.classList.add("show"); dismissHint(); }
    }, 2600);
    setTimeout(function () { hint.classList.remove("show"); }, 12000);
  }
})();
