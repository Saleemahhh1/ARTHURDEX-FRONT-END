// ArthurDex frontend - full flow (4 dashboards + tx history)

// ---------- CONFIG ----------
const BACKEND_URL = "https://arthurdex.onrender.com";
const WALLETCONNECT_PROJECT_ID = "031c9ba70da1c67907ed7484f7a6aa64";

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
const create = (tag, props = {}, text = "") => {
  const el = document.createElement(tag);
  Object.assign(el, props);
  if (text) el.textContent = text;
  return el;
};

// ---------- Intro sequence (Dashboard 1) ----------
const introMessages = [
  "DEFIN SECURE DECENTRALIZED",
  "TOKENIZED REAL WORLD ASSETS"
];
let introIdx = 0;
function typeText(msg, done) {
  let i = 0;
  $("introLine").textContent = "";
  const t = setInterval(() => {
    $("introLine").textContent += msg.charAt(i);
    i++;
    if (i >= msg.length) {
      clearInterval(t);
      setTimeout(done, 700);
    }
  }, 80);
}
function runIntro() {
  if (introIdx < introMessages.length) {
    typeText(introMessages[introIdx], () => {
      $("introLine").textContent = "";
      introIdx++;
      runIntro();
    });
  } else {
    $("powered").classList.remove("hidden");
    setTimeout(() => {
      $("introScreen").classList.add("hidden");
      $("termsScreen").classList.remove("hidden");
    }, 800);
  }
}

// ---------- Flow helpers ----------
function clearFlow() { $("flowContainer").innerHTML = ""; }
function appendCard(title, nodes = []) {
  const card = create("div", { className: "card" });
  if (title) card.appendChild(create("h4", {}, title));
  nodes.forEach(n => card.appendChild(n));
  $("flowContainer").appendChild(card);
  return card;
}

// ---------- Passphrase generation & verify ----------
const WORDS = ["secure","ledger","hash","block","token","chain","wallet","arthur","dex","smart","trust","node","asset","orbit","lumen","terra","prime","nova","mint","root","pulse","vector","alpha","beta","gamma","crypt","digital"];
function gen12() {
  return Array.from({length:12}, ()=> WORDS[Math.floor(Math.random()*WORDS.length)]).join(" ");
}
function showPassphraseFlow(passphrase) {
  clearFlow();
  const pEl = create("p",{className:"passphrase"}, passphrase);
  const hint = create("div",{className:"hint"},"Copy and keep it safe. You will verify before continuing.");
  const copyBtn = create("button", {}, "Copy passphrase");
  const verifyBtn = create("button", {}, "Verify now");
  copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(passphrase); copyBtn.textContent = "Copied ✓"; }
    catch(e){ alert("Copy failed — copy manually."); }
  };
  verifyBtn.onclick = ()=> showPassphraseVerify(passphrase);
  appendCard("Your 12-word passphrase", [pEl, hint, copyBtn, verifyBtn]);
}
function showPassphraseVerify(passphrase) {
  clearFlow();
  const words = passphrase.split(/\s+/);
  let i1 = Math.floor(Math.random()*12), i2 = Math.floor(Math.random()*12);
  while (i2 === i1) i2 = Math.floor(Math.random()*12);
  const instr = create("p",{className:"hint"},`Enter word #${i1+1} and word #${i2+1}`);
  const in1 = create("input",{placeholder:`Word ${i1+1}`, style:"width:100%;padding:8px;margin-top:8px;border-radius:6px;"});
  const in2 = create("input",{placeholder:`Word ${i2+1}`, style:"width:100%;padding:8px;margin-top:8px;border-radius:6px;"});
  const fb = create("div",{className:"hint"});
  const btn = create("button", {}, "Confirm & Enter Dashboard");
  btn.onclick = ()=> {
    if (in1.value.trim().toLowerCase() === words[i1] && in2.value.trim().toLowerCase() === words[i2]) {
      fb.textContent = "✅ Verified — welcome!";
      enterMainDashboard();
    } else {
      fb.textContent = "❌ Incorrect words.";
    }
  };
  appendCard("Verify your passphrase", [instr, in1, in2, btn, fb]);
}

// ---------- Quiz ----------
function showQuizFlow() {
  clearFlow();
  const questions = [
    { q:"1/3 IS ARTHURDEX A CUSTODIAN WALLET?", opts:["Yes","No"], correct:1 },
    { q:"2/3 IF ANYONE ASKS FOR YOUR PASSPHRASE, WHAT WILL YOU DO?", opts:["I will block them","I will give it"], correct:0 },
    { q:"3/3 IF YOU LOST YOUR ASSET, WILL ARTHURDEX RETURN IT?", opts:["Yes","No"], correct:1 }
  ];
  let qi = 0;
  const card = appendCard("Security Quiz (3)");
  const qEl = create("div"); card.appendChild(qEl);
  const opts = create("div",{className:"quiz-options"}); card.appendChild(opts);
  const fb = create("div",{className:"hint"}); card.appendChild(fb);

  function render() {
    const cur = questions[qi];
    qEl.textContent = cur.q;
    opts.innerHTML = ""; fb.textContent = "";
    cur.opts.forEach((o, idx)=> {
      const b = create("button", {}, o);
      b.onclick = () => {
        if (idx === cur.correct) {
          fb.textContent = "✅ Correct";
          qi++;
          if (qi < questions.length) setTimeout(render, 800);
          else setTimeout(()=> { const p = gen12(); showPassphraseFlow(p); }, 400);
        } else {
          fb.textContent = "❌ Wrong — try again";
        }
      };
      opts.appendChild(b);
    });
  }
  render();
}

// ---------- WalletConnect / HashPack ----------
let SignClientLib=null, ModalLib=null;
async function initWalletConnectLibs() {
  if (SignClientLib && ModalLib) return { SignClientLib, ModalLib };
  try {
    const sign = await import('https://unpkg.com/@walletconnect/sign-client@2.0.43/dist/esm/index.js');
    SignClientLib = sign?.SignClient || sign?.default || sign;
    const modal = await import('https://unpkg.com/@walletconnect/modal@2.0.2/dist/esm/index.js');
    ModalLib = modal?.WalletConnectModal || modal?.default || modal;
    return { SignClientLib, ModalLib };
  } catch (e) {
    console.warn("WalletConnect import failed:", e);
    return null;
  }
}
async function connectHashPackFlow() {
  try {
    const libs = await initWalletConnectLibs();
    if (!libs) return alert("WalletConnect libraries not available.");
    const { SignClientLib: SignClient, ModalLib: WalletConnectModal } = libs;
    const modal = new WalletConnectModal({ projectId: WALLETCONNECT_PROJECT_ID, standaloneChains: ["hedera:testnet"] });
    const signClient = await SignClient.init({ projectId: WALLETCONNECT_PROJECT_ID });
    const { uri, approval } = await signClient.connect({
      requiredNamespaces: {
        hedera: {
          methods: ["hedera_signMessage","hedera_signTransaction"],
          chains: ["hedera:testnet"],
          events: ["accountsChanged"]
        }
      }
    });
    if (uri) await modal.openModal({ uri });
    const session = await approval();
    const account = session?.namespaces?.hedera?.accounts?.[0];
    if (account) {
      $("accountInfo").textContent = `Connected: ${account}`;
      enterMainDashboard(account);
    }
    modal.closeModal();
  } catch (err) {
    console.error("connectHashPackFlow error:", err);
    alert("Wallet connection failed.");
  }
}

// ---------- Main Dashboard + Transactions ----------
async function enterMainDashboard(accountId) {
  $("walletOptions").classList.add("hidden");
  $("mainDashboard").classList.remove("hidden");
  $("mainAccount").textContent = accountId || "Local Wallet";
  await loadBalance(accountId);
  await loadTransactions(accountId);
}
async function loadBalance(accountId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/balance/${accountId||""}`);
    if (res.ok) {
      const json = await res.json();
      $("hbarBalance").textContent = json.hbar ?? "0";
      $("usdtBalance").textContent = (json.hbar ? (json.hbar*0.07).toFixed(2) : "0.00");
    }
  } catch(e) {
    $("hbarBalance").textContent = "N/A";
    $("usdtBalance").textContent = "N/A";
  }
}
async function loadTransactions(accountId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/transactions/${accountId||""}`);
    if (res.ok) {
      const json = await res.json();
      renderTransactions(json.transactions || []);
    }
  } catch (e) {
    console.error("tx fetch failed", e);
  }
}
function renderTransactions(list) {
  const c = $("txHistory");
  c.innerHTML = "";
  if (!list.length) {
    c.textContent = "No transactions yet.";
    return;
  }
  list.forEach(tx => {
    const item = create("div",{className:"tx-item"});
    item.innerHTML = `
      <div><b>Type:</b> ${tx.type}</div>
      <div><b>Amount:</b> ${tx.amount} HBAR</div>
      <div><b>Date:</b> ${new Date(tx.timestamp).toLocaleString()}</div>
      <hr/>
    `;
    c.appendChild(item);
  });
}

// ---------- attach handlers ----------
function attachHandlers() {
  $("acceptTerms").onclick = ()=> {
    $("termsScreen").classList.add("hidden");
    $("walletOptions").classList.remove("hidden");
  };
  $("btnConnectHashpack").onclick = connectHashPackFlow;
  $("btnGeneratePass").onclick = ()=> {
    const p = gen12(); showPassphraseFlow(p);
  };
  $("btnQuiz").onclick = showQuizFlow;
}

// ---------- Initialize ----------
document.addEventListener("DOMContentLoaded", () => {
  runIntro();
  attachHandlers();
});
