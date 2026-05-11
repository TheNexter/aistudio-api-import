console.log("[AI Studio Importer] Extension chargée");

let importFinishedPermanently = false;

function base64ToFile(base64Data, mimeType, index) {
    try {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
        const byteCharacters = atob(cleanBase64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: mimeType });
        let ext = mimeType.split('/')[1] || 'bin';
        if(ext === 'jpeg') ext = 'jpg';
        if(ext.includes('+')) ext = ext.split('+')[0];
        return new File([blob], `file_${index}.${ext}`, { type: mimeType });
    } catch (err) {
        console.error(`[AI Studio Importer] Erreur de conversion Base64:`, err);
        throw err;
    }
}

async function ensureMenuClosed() {
    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    if (backdrop) {
        backdrop.click();
        await new Promise(r => setTimeout(r, 300));
    }
}

async function submitMessageToContext() {
    const textarea = document.querySelector('textarea[formcontrolname="promptText"]');
    if (textarea) {
        textarea.focus();
        const eventConfig = {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            altKey: true, bubbles: true, cancelable: true, composed: true
        };
        textarea.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
        textarea.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
        await new Promise(r => setTimeout(r, 1200));
    }
}

async function processJsonInput(jsonString) {
    console.log("[AI Studio Importer] Début du traitement...");
    try {
        const data = JSON.parse(jsonString);
        const contents = data.contents;
        const textarea = document.querySelector('textarea[formcontrolname="promptText"]');

        if (!contents || !textarea) return;

        const systemInstruction = data.system_instruction?.parts?.[0]?.text;
        console.log("[AI Studio Importer] systemInstruction found in JSON:", systemInstruction);
        if (systemInstruction) {
            let sysToggle = document.querySelector('[data-test-id="system-instructions-toggle"], button[aria-label*="system" i]');
            if (!sysToggle) {
                const allEls = document.querySelectorAll('button, [role="button"], .mat-expansion-panel-header');
                for (const el of allEls) {
                    if (el.textContent.toLowerCase().includes('system instruction')) {
                        sysToggle = el;
                        break;
                    }
                }
            }
            console.log("[AI Studio Importer] sysToggle found:", sysToggle);
            
            let sysTextarea = document.querySelector('textarea[aria-label="System instructions"], textarea[formcontrolname="systemInstruction"]');
            if (!sysTextarea && sysToggle) {
                sysToggle.click();
                console.log("[AI Studio Importer] Clicked system instruction toggle");
                await new Promise(r => setTimeout(r, 1000));
                sysTextarea = document.querySelector('textarea[aria-label="System instructions"], textarea[formcontrolname="systemInstruction"]');
                console.log("[AI Studio Importer] sysTextarea after toggle click:", sysTextarea);
            }
            if (!sysTextarea) {
                console.log("[AI Studio Importer] All textareas on page:", [...document.querySelectorAll('textarea')].map(t => ({ outerHTML: t.outerHTML.slice(0, 200), value: t.value })));
            }
            if (sysTextarea) {
                sysTextarea.value = systemInstruction;
                sysTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                console.log("[AI Studio Importer] System instruction set:", systemInstruction);
                await new Promise(r => setTimeout(r, 300));
            }

            const closeBtn = document.querySelector('button[data-test-close-button]');
            if (closeBtn) {
                closeBtn.click();
                console.log("[AI Studio Importer] Closed system instruction panel");
                await new Promise(r => setTimeout(r, 500));
            }
        }

        for (let c = 0; c < contents.length; c++) {
            const parts = contents[c].parts;
            if (!parts) continue;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                textarea.value = "";
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                if (part.text) {
                    textarea.value = part.text;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    await new Promise(r => setTimeout(r, 300));
                    await submitMessageToContext();
                } 
                else if (part.inline_data) {
                    const inlineData = part.inline_data;
                    const file = base64ToFile(inlineData.data, inlineData.mime_type, `${c}_${i}`);

                    const addMediaBtn = document.querySelector('button[data-test-id="add-media-button"]');
                    if (addMediaBtn) {
                        addMediaBtn.click();
                        await new Promise(r => setTimeout(r, 600));
                    }

                    const fileInput = document.querySelector('input.file-input[type="file"]');
                    if (fileInput) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        await ensureMenuClosed();
                        await new Promise(r => setTimeout(r, 3500)); 
                        await submitMessageToContext();
                    }
                }
            }
        }

        // Fin du processus : Passage en vert puis suppression
        console.log("[AI Studio Importer] ✅ Done !");
        const btn = document.getElementById('json-inject-btn');
        if (btn) {
            btn.classList.add('success');
            btn.innerText = "Import Done !";
            
            setTimeout(() => {
                btn.remove();
                importFinishedPermanently = true; // Empêche l'observer de le recréer
            }, 5000);
        }

    } catch (e) {
        console.error("[AI Studio Importer] Error:", e);
    }
}

function createImportModal() {
    if (document.getElementById('json-import-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'json-import-modal';
    modal.innerHTML = `
        <div class="json-modal-content">
            <h3>Import JSON</h3>
            <textarea id="json-json-input" placeholder="Paste JSON request here..."></textarea>
            <div class="json-modal-actions">
                <button class="json-btn-cancel" id="json-cancel-btn">Annuler</button>
                <button class="json-btn-import" id="json-confirm-btn">Lancer l'import</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('json-cancel-btn').addEventListener('click', () => modal.remove());
    document.getElementById('json-confirm-btn').addEventListener('click', () => {
        const val = document.getElementById('json-json-input').value;
        if (val) processJsonInput(val);
        modal.remove();
    });
}

function injectButton() {
    if (!window.location.href.includes('/prompts/new_chat')) return;
    if (document.getElementById('json-inject-btn') || importFinishedPermanently) return;

    const wrapper = document.querySelector('ms-prompt-box .button-wrapper');
    if (!wrapper) return;

    const btn = document.createElement('button');
    btn.id = 'json-inject-btn';
    btn.className = 'custom-import-btn';
    btn.innerText = `Import JSON`; // Texte seul, sans icône
    btn.onclick = (e) => { e.preventDefault(); createImportModal(); };
    wrapper.insertBefore(btn, wrapper.firstChild);
}

const observer = new MutationObserver(() => injectButton());
observer.observe(document.body, { childList: true, subtree: true });