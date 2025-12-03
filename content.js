console.log("[CPI Autofill] Loaded. ");

function waitForExternalizeDialog() {
    const dialog = document.querySelector("div[id*='extDialog']");
    if (!dialog) return;

    if (!document.getElementById("externalizeAllButton")) {
        injectButton(dialog);
    }
}

setInterval(waitForExternalizeDialog, 500);


function injectButton(dialog) {
    const btn = document.createElement("button");
    btn.id = "externalizeAllButton";
    btn.innerText = "Externalize All";
    btn.style.position = "absolute";
    btn.style.top = "3px";
    btn.style.right = "10px";
    btn.style.zIndex = "99999";
    btn.style.padding = "8px 14px";
    btn.style.background = "#0070f2";
    btn.style.color = "white";
    btn.style.borderRadius = "6px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.onclick = fillExternalizeFields;

    dialog.appendChild(btn);
}



function triggerSAPUI5Input(input, value) {
    input.value = value;

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Enter simulieren (um Token-Generierung zu triggern)
    const enterEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        keyCode: 13,
        which: 13
    });
    input.dispatchEvent(enterEvent);
}

function normalizeLabel(label) {
    return label
        .trim()
        .replace(/\(.*?\)/g, "")      
        .replace(/[^a-zA-Z0-9 ]/g, "") 
        .replace(/\s+/g, "_");         
}

function fillExternalizeFields() {
    const labels = document.querySelectorAll("label[id*='label']");

    labels.forEach(label => {
        const name = label.innerText.trim();
        const clean = normalizeLabel(name);
        const targetValue = "{{" + clean + "}}";

        const container = label.closest(".sapUiFormResGrid");
        if (!container) return;

        // LEFT INPUT = Parameter Name
        const leftInput = container.querySelector("input.sapMInputBaseInner");

        // RIGHT VALUE FIELD = Default Value / Token / Input
        const rightTokenizer = container.parentElement.querySelector(".sapMTokenizer");
        const rightInput =
            container.parentElement.querySelectorAll("input.sapMInputBaseInner")[1];

        let rightValue = "";

        // Extract right side value
        if (rightTokenizer) {
            const t = rightTokenizer.querySelector(".sapMTokenText");
            rightValue = t ? t.innerText.trim() : "";
        } else if (rightInput) {
            rightValue = rightInput.value.trim();
        }

        const leftEmpty = !leftInput || leftInput.value.trim() === "";
        const rightEmpty = rightValue === "";

        // =============================
        // CASE 1: left empty + right empty
        // =============================
        if (leftEmpty && rightEmpty) {
            triggerSAPUI5Input(leftInput, targetValue);
            return;
        }

        // =============================
        // CASE 2: left empty + right has value
        // → externalize AND keep right-value
        // =============================
        if (leftEmpty && !rightEmpty) {
            // set left side to {{Param}}
            triggerSAPUI5Input(leftInput, targetValue);

            // keep right side exactly as it is
            // but remove the placeholder token if needed
            if (rightTokenizer) {
                rightTokenizer.innerHTML = `
                    <span class="sapMTokenText">${rightValue}</span>
                `;
            } else if (rightInput) {
                rightInput.value = rightValue;
                rightInput.dispatchEvent(new Event("input", { bubbles: true }));
                rightInput.dispatchEvent(new Event("change", { bubbles: true }));
            }

            return;
        }

        // =============================
        // CASE 3: left has value already → NEVER touch it
        // =============================
        return;
    });
}


function fillExternalizeFields2() {
    const labels = document.querySelectorAll("label[id*='label']");

    labels.forEach(label => {
        const name = label.innerText.trim();
        const clean = normalizeLabel(name);
        const targetValue = "{{" + clean + "}}";

        const container = label.closest(".sapUiFormResGrid");
        if (!container) return;

        // ---------- wichtigste NEUERUNG: CHECK RECHTS -----------
        const rightValueField =
            container.parentElement.querySelector("input.sapMInputBaseInner:not(:first-child)") ||
            container.parentElement.querySelector(".sapMToken");

        const rightTokenizer =
            container.parentElement.querySelector(".sapMTokenizer");

        const rightHasValue =
            (rightValueField && rightValueField.value && rightValueField.value.trim() !== "") ||
            (rightTokenizer && rightTokenizer.querySelector(".sapMTokenText"));

        if (rightHasValue) {
            console.log(" → Skip (right side already has value):", name);
            return;
        }
        // ---------------------------------------------------------

        // 1) Normales Input-Feld links
        const input = container.querySelector("input.sapMInputBaseInner");

        if (input) {
            if (input.value.trim() === "") {
                triggerSAPUI5Input(input, targetValue);
            }
            return;
        }

        // 2) Token Feld
        const tokenizer = container.querySelector(".sapMTokenizer");
        if (tokenizer) {
            const existingTokens = tokenizer.querySelectorAll(".sapMTokenText");
            if (existingTokens.length === 0) {
                const innerInput = container.querySelector("input.sapMInputBaseInner");
                if (innerInput) triggerSAPUI5Input(innerInput, targetValue);
            }
            return;
        }
    });
}



function fillExternalizeFields2() {
    console.log("[CPI Autofill] Filling only empty fields...");

    const labels = document.querySelectorAll("label[id*='label']");

    labels.forEach(label => {
        const name = label.innerText.trim();
        const container = label.closest(".sapUiFormResGrid");
        if (!container) return;

        // Zielwert generieren

        const targetParam = normalizeLabel(name);
        const targetValue = "{{" + targetParam + "}}";

        // 1) Normales Input-Feld
        const input = container.querySelector("input.sapMInputBaseInner");
        if (input) {
            if (input.value.trim() === "") {
                console.log(" → Setting Input:", name);
                triggerSAPUI5Input(input, targetValue);
            } else {
                console.log(" → Skip Input (already set):", name);
            }
            return;
        }

        // 2) Token-Feld (sapMTokenizer)
        const tokenizer = container.querySelector(".sapMTokenizer");
        if (tokenizer) {
            const existingTokens = tokenizer.querySelectorAll(".sapMTokenText");

            if (existingTokens.length === 0) {
                console.log(" → Setting Token:", name);

                // Eigentlich müsste man die SAPUI5 MultiInput-Control ansprechen,
                // aber wir hacken es zuverlässig über das zugehörige Input-Feld:
                const relatedInput = container.querySelector("input.sapMInputBaseInner");
                if (relatedInput) {
                    triggerSAPUI5Input(relatedInput, targetValue);
                } else {
                    console.log(" → WARN: Tokenizer found but no input field detected!");
                }
            } else {
                console.log(" → Skip Token (already set):", name);
            }

            return;
        }

        // 3) Checkboxen
        const checkbox = container.querySelector(".sapMCb");
        if (checkbox) {
            const cbInput = checkbox.querySelector("input[type='checkbox']");
            if (cbInput && cbInput.checked === false) {
                cbInput.checked = true;
                cbInput.dispatchEvent(new Event("change", { bubbles: true }));
                console.log(" → Checked:", name);
            }
            return;
        }
    });

    console.log("[CPI Autofill] Done.");
}

