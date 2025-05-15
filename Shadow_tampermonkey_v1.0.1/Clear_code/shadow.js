// ==UserScript==
// @name         SHADOW
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  -
// @match        https://www.twickets.live/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const currentURL = new URL(window.location.href);
    if (currentURL.hostname === "www.twickets.live" && currentURL.pathname.includes("/app/block/")) {
        const ref = currentURL.searchParams.get("ref");
        const decryptionKey = "Hvcw4Frg8m1lgimdh7rdzC8fIRsjpVlv74-xo3DFht4=";

        if (ref) {
            const decrypt = (encrypted, key) => {
                try {
                    return atob(encrypted.replace(/-/g, "+").replace(/_/g, "/"))
                        .split('')
                        .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
                        .join('');
                } catch (e) {
                    return null;
                }
            };

            const decrypted = decrypt(ref, decryptionKey);
            if (decrypted) {
                const [holdExpires, holdReference] = decrypted.split("|");
                sessionStorage.setItem("ngStorage-holdReference", `"${holdReference}"`);
                sessionStorage.setItem("ngStorage-holdExpires", `"${holdExpires}"`);

               
                if (!currentURL.searchParams.has("reloaded")) {
                    currentURL.searchParams.set("reloaded", "true");
                    window.location.href = currentURL.toString(); 
                }
            }
        }
    }

    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function(key, value) {
        if (key === 'ngStorage-holdReference' || key === 'ngStorage-holdExpires') return;
        originalSetItem.apply(sessionStorage, arguments);
    };

    const originalRemoveItem = sessionStorage.removeItem;
    sessionStorage.removeItem = function(key) {
        if (key === 'ngStorage-holdReference' || key === 'ngStorage-holdExpires') return;
        originalRemoveItem.apply(sessionStorage, arguments);
    };

    const originalClear = sessionStorage.clear;
    sessionStorage.clear = function() {
        return; 
    };

    if (!sessionStorage.getItem('ngStorage-holdReference') || !sessionStorage.getItem('ngStorage-holdExpires')) {
        sessionStorage.setItem('ngStorage-holdReference', '"defaultHoldReference"');
        sessionStorage.setItem('ngStorage-holdExpires', '"defaultHoldExpires"');
    }

    const originalFetch = window.fetch;
    window.fetch = async function(resource, options) {
        if (typeof resource === 'string' && resource.includes("https://www.twickets.live/services/bookings/release")) {
            return Promise.resolve(new Response(JSON.stringify({ success: false }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            }));
        }
        return originalFetch.apply(this, arguments);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (url.includes("https://www.twickets.live/services/bookings/release")) {
            this.abort(); 
            return;
        }
        originalXHROpen.apply(this, arguments);
    };

    function automateNavigation(selector) {
        const automate = () => {
            const element = document.querySelector(selector);
            if (element) {
                element.click();
                setTimeout(() => {
                    const currentURL = new URL(window.location.href);
                    const checkoutURL = currentURL.origin + currentURL.pathname + "/checkout";
                    let retryCount = 0;

                    const navigateToCheckout = () => {
                        if (!window.location.href.includes("/checkout")) {
                            window.location.replace(checkoutURL);
                            retryCount++;
                            if (retryCount < 5) setTimeout(navigateToCheckout, 10000);
                        }
                    };
                    navigateToCheckout();
                }, 10000);
            } else {
                setTimeout(automate, 2000); 
            }
        };
        automate();
    }
    if (currentURL.searchParams.has("reloaded")) {
        automateNavigation('a[ng-click="checkCaptchaForBuying()"]');
    }
})();
