(function () {
  "use strict";

  var form = document.getElementById("check-form");
  var message = document.getElementById("message");
  var count = document.getElementById("count");
  var status = document.getElementById("status");
  var button = document.getElementById("submit");
  var results = document.getElementById("results");
  var busy = false;
  var latest = null;

  var rules = [
    {id:"fee",name:"Upfront or activation fee",severity:"high",weight:22,terms:["activation fee","upfront fee","pay a fee","registration fee","deposit"],action:"Do not pay to access a job; verify through the official platform."},
    {id:"gift",name:"Gift-card request",severity:"high",weight:24,terms:["gift card","gift-card","itunes card"],action:"Decline and do not send codes or card numbers."},
    {id:"crypto",name:"Cryptocurrency payment request",severity:"high",weight:22,terms:["pay in crypto","cryptocurrency","bitcoin","usdt"],action:"Use a protected, agreed payment method instead."},
    {id:"check",name:"Check overpayment or refund pattern",severity:"critical",weight:30,terms:["overpayment","send the balance back","refund the difference","cash this check"],action:"Do not deposit or forward funds; contact your bank if you already did."},
    {id:"equipment",name:"Equipment or training purchase",severity:"high",weight:18,terms:["buy equipment","purchase supplies","pay for training"],action:"Do not buy from a specified seller to start work."},
    {id:"guarantee",name:"Guaranteed or unusually high income",severity:"medium",weight:8,terms:["guaranteed income","guaranteed payment","make $","easy money"],action:"Ask for a specific scope, rate, and written payment schedule."},
    {id:"urgent",name:"Urgency or pressure",severity:"medium",weight:7,terms:["act now","urgent","today only","immediately"],action:"Pause and verify independently before responding."},
    {id:"offplatform",name:"Off-platform payment pressure",severity:"high",weight:16,terms:["pay outside","off-platform","telegram payment","use whatsapp"],action:"Keep messages and payment inside the platform where possible."},
    {id:"credentials",name:"Password or account-access request",severity:"critical",weight:30,terms:["password","login details","account access","verification code"],action:"Never share credentials or one-time codes."},
    {id:"free",name:"Unbounded free test work",severity:"medium",weight:10,terms:["free sample","unpaid test","test project"],action:"Set a small paid test or a clear time and usage boundary."},
    {id:"vague",name:"Broad or vague deliverables",severity:"low",weight:5,terms:["do everything","various tasks","as needed"],action:"Request deliverables, revisions, timeline, and ownership terms in writing."},
    {id:"schedule",name:"Unclear payment schedule",severity:"medium",weight:8,terms:["we'll discuss payment","payment later","when the project ends"],action:"Get rate, milestones, currency, and due dates in writing."},
    {id:"contract",name:"Refusal to use a contract or escrow",severity:"high",weight:15,terms:["no contract","don't need a contract","no escrow"],action:"Pause until the scope and payment terms are documented."},
    {id:"recruit",name:"Recruitment-based earning",severity:"high",weight:20,terms:["recruit others","build your team","referral bonus","downline"],action:"Avoid opportunities where earning depends on recruiting."},
    {id:"download",name:"Suspicious download or attachment request",severity:"high",weight:20,terms:["download this file","run this installer","open this attachment","install"],action:"Do not open unexpected files; verify through a trusted channel."},
    {id:"supplies",name:"Specified-seller purchase request",severity:"high",weight:18,terms:["buy from our supplier","use this vendor","purchase from our store"],action:"Do not pay a seller selected by an unverified client."}
  ];

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function createTextElement(tag, text, className) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(text || "");
    return element;
  }

  function detect(input) {
    var text = normalize(input.message + " " + input.website + " " + input.flags.join(" "));

    return rules.filter(function (rule) {
      return rule.terms.some(function (term) {
        return text.indexOf(term) !== -1;
      });
    }).map(function (rule) {
      var evidence = rule.terms.find(function (term) {
        return text.indexOf(term) !== -1;
      });

      return {
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        weight: rule.weight,
        evidence: evidence,
        action: rule.action
      };
    });
  }

  function makeFallback(input) {
    var flags = detect(input);
    var score = flags.reduce(function (sum, item) {
      return sum + item.weight;
    }, 0);

    if (input.flags.indexOf("money") !== -1 && score < 50) score = 50;
    if (input.flags.indexOf("sensitive") !== -1 && score < 75) score = 75;

    score = Math.min(100, score);

    var level = score >= 75 ? "Critical" :
      score >= 50 ? "High" :
      score >= 25 ? "Moderate" : "Low";

    var summary = flags.length
      ? "Risk signals were detected. Pause and verify before sending money, work, or sensitive information."
      : "No obvious high-confidence red flags were detected, but this is not proof that the opportunity is safe.";

    var questions = flags.length
      ? [
          "Who is the legal client and what official channel confirms that identity?",
          "What are the exact deliverables, rate, milestones, and payment dates?",
          "Can payment and communication remain on the platform or a written contract?"
        ]
      : [
          "Can the client verify their identity through an official company channel?",
          "What are the written scope, payment terms, and cancellation terms?"
        ];

    var reply = flags.length
      ? "Thanks for the opportunity. Before I proceed, please confirm the scope, payment schedule, and client identity through the official platform or company channel. I do not pay upfront fees, share credentials, or open unexpected files. Once those details are confirmed, I can discuss next steps."
      : "Thanks for reaching out. Please share the written scope, payment schedule, client details, and expected timeline. I will review those details before confirming availability.";

    return {
      score: score,
      level: level,
      summary: summary,
      flags: flags,
      questions: questions,
      reply: reply,
      provider: "rules"
    };
  }

  function validReport(report) {
    return Boolean(
      report &&
      Number.isFinite(report.score) &&
      report.score >= 0 &&
      report.score <= 100 &&
      ["Low", "Moderate", "High", "Critical"].indexOf(report.level) !== -1 &&
      typeof report.summary === "string" &&
      report.summary.length <= 2000 &&
      Array.isArray(report.flags) &&
      report.flags.every(function (flag) {
        return flag &&
          typeof flag.id === "string" &&
          typeof flag.name === "string" &&
          ["low", "medium", "high", "critical"].indexOf(flag.severity) !== -1 &&
          typeof flag.evidence === "string" &&
          typeof flag.action === "string";
      }) &&
      Array.isArray(report.questions) &&
      report.questions.every(function (item) {
        return typeof item === "string";
      }) &&
      typeof report.reply === "string" &&
      report.reply.length <= 3000
    );
  }

  function getApiUrl() {
    return typeof window.API_URL === "string" ? window.API_URL.trim() : "";
  }

  async function requestReport(input, apiUrl) {
    var response = await fetch(apiUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(input)
    });

    if (!response.ok) throw new Error("API request failed");

    var data = await response.json();

    if (!validReport(data)) throw new Error("Invalid report");

    return data;
  }

  function render(report) {
    latest = report;
    results.hidden = false;

    document.getElementById("score").textContent = report.score + "/100 · " + report.level;
    document.getElementById("summary").textContent = report.summary;

    var flagsContainer = document.getElementById("flags");
    flagsContainer.replaceChildren();
    flagsContainer.appendChild(createTextElement("h3", "Red flags"));

    if (report.flags.length) {
      report.flags.forEach(function (item) {
        var flag = document.createElement("div");
        flag.className = "flag";

        var heading = createTextElement(
          "strong",
          item.severity.toUpperCase() + ": " + item.name,
          item.severity
        );

        var evidence = createTextElement("span", "Evidence: “" + item.evidence + "”");
        var action = createTextElement("span", item.action);

        flag.appendChild(heading);
        flag.appendChild(evidence);
        flag.appendChild(document.createElement("br"));
        flag.appendChild(action);
        flagsContainer.appendChild(flag);
      });
    } else {
      flagsContainer.appendChild(
        createTextElement("p", "No obvious high-confidence red flags detected. Keep verifying.", "flag low")
      );
    }

    var checksContainer = document.getElementById("checks");
    checksContainer.replaceChildren();
    checksContainer.appendChild(createTextElement("h3", "Verification questions"));

    var list = document.createElement("ul");
    list.className = "checks-list";

    report.questions.forEach(function (question) {
      var item = document.createElement("li");
      item.className = "check";
      item.textContent = question;
      list.appendChild(item);
    });

    checksContainer.appendChild(list);

    var replyContainer = document.getElementById("reply-box");
    replyContainer.replaceChildren();
    replyContainer.appendChild(createTextElement("h3", "Safer reply"));
    replyContainer.appendChild(createTextElement("div", report.reply, "reply"));

    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    results.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });

    results.focus({preventScroll: true});
  }

  function readInput() {
    return {
      message: message.value.trim(),
      website: document.getElementById("website").value.trim(),
      platform: document.getElementById("platform").value,
      flags: Array.from(
        form.querySelectorAll("input[type=checkbox]:checked")
      ).map(function (item) {
        return item.value;
      })
    };
  }

  async function copyText(text) {
    if (!navigator.clipboard || !window.isSecureContext) {
      throw new Error("Clipboard unavailable");
    }

    await navigator.clipboard.writeText(text);
  }

  function downloadCard(report) {
    var summary = escapeXml(report.summary);
    var level = escapeXml(report.level);
    var score = escapeXml(report.score + "/100");
    var firstFlags = report.flags.slice(0, 3).map(function (item, index) {
      return "<text x=\"50\" y=\"" + (360 + index * 30) + "\" font-family=\"Arial\" font-size=\"20\" fill=\"#172033\">• " +
        escapeXml(item.name) + "</text>";
    }).join("");

    var svg = [
      "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"900\" height=\"520\" viewBox=\"0 0 900 520\">",
      "<rect width=\"100%\" height=\"100%\" fill=\"#f6f8fb\"/>",
      "<rect x=\"30\" y=\"30\" width=\"840\" height=\"460\" rx=\"24\" fill=\"#fff\" stroke=\"#dce3ee\"/>",
      "<text x=\"50\" y=\"90\" font-family=\"Arial\" font-size=\"34\" font-weight=\"bold\" fill=\"#172033\">ClientShield</text>",
      "<text x=\"50\" y=\"170\" font-family=\"Arial\" font-size=\"48\" font-weight=\"bold\" fill=\"#2857d8\">" + score + " · " + level + "</text>",
      "<text x=\"50\" y=\"225\" font-family=\"Arial\" font-size=\"20\" fill=\"#172033\">" + summary.slice(0, 110) + "</text>",
      firstFlags,
      "<text x=\"50\" y=\"455\" font-family=\"Arial\" font-size=\"16\" fill=\"#5f6b80\">Screening estimate, not proof of fraud.</text>",
      "</svg>"
    ].join("");

    var blob = new Blob([svg], {type: "image/svg+xml"});
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = objectUrl;
    link.download = "clientshield-screening.svg";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    status.textContent = "Share card downloaded.";
  }

  message.addEventListener("input", function () {
    count.textContent = Array.from(message.value).length;
  });

  document.getElementById("example").addEventListener("click", function () {
    message.value = "We can pay you $2,000 weekly. First buy equipment from our supplier and send a $300 activation fee. Please act now and move to Telegram.";
    message.dispatchEvent(new Event("input"));

    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: form.offsetTop,
      behavior: reduceMotion ? "auto" : "smooth"
    });

    message.focus();
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (busy) return;

    if (!message.value.trim()) {
      status.textContent = "Paste a message or job post first.";
      message.focus();
      return;
    }

    busy = true;
    button.disabled = true;
    status.textContent = "Checking available evidence…";

    var input = readInput();
    var fallback = makeFallback(input);

    render(fallback);

    var apiUrl = getApiUrl();

    if (!apiUrl) {
      status.textContent = "Using the rules-only report.";
      busy = false;
      button.disabled = false;
      return;
    }

    try {
      render(await requestReport(input, apiUrl));
      status.textContent = "Report ready. Results are displayed below.";
    } catch (error) {
      console.warn("API report unavailable:", error.name);
      status.textContent = "The API was unavailable. A rules-only report is ready.";
    } finally {
      busy = false;
      button.disabled = false;
    }
  });

  document.getElementById("copy-reply").addEventListener("click", async function () {
    if (!latest) return;

    try {
      await copyText(latest.reply);
      status.textContent = "Reply copied.";
    } catch (error) {
      status.textContent = "Copy failed. Select and copy the reply manually.";
    }
  });

  document.getElementById("copy-share").addEventListener("click", async function () {
    if (!latest) return;

    var text = "ClientShield screening: " +
      latest.score + "/100 — " +
      latest.level + ". " +
      latest.summary +
      " Screening estimate, not proof of fraud.";

    try {
      await copyText(text);
      status.textContent = "Privacy-safe summary copied.";
    } catch (error) {
      status.textContent = "Copy failed. Select and copy the summary manually.";
    }
  });

  document.getElementById("download").addEventListener("click", function () {
    if (latest) downloadCard(latest);
  });
}());
