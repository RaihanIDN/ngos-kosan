import { animate, inView, scroll } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initGlobalAnimations() {
    if (reduceMotion) return;
    document.documentElement.classList.add("js-motion-ready");

    // 1. Scroll Progress Bar di atas navbar
    const progressBar = document.getElementById("scrollProgress");
    if (progressBar) {
        scroll(animate(progressBar, { scaleX: [0, 1] }, { ease: "linear" }));
    }

    // 2. Animasi masuk Hero Section
    document.querySelectorAll(".hero-animate").forEach((el, index) => {
        animate(
            el,
            { opacity: [0, 1], y: [22, 0] },
            { duration: 0.48, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }
        );
    });

    // 3. Animasi section keunggulan saat masuk layar
    inView(
        ".feature-card",
        (info) => {
            const target = info?.target || info;
            animate(
                target,
                { opacity: [0, 1], y: [20, 0] },
                { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
            );
        },
        { margin: "0px 0px -30px 0px" }
    );
}

export function observeKostCards() {
    const cards = document.querySelectorAll("#kostListContainer .property-card");
    if (reduceMotion) {
        cards.forEach(c => (c.style.opacity = "1"));
        return;
    }

    inView(
        "#kostListContainer .property-card",
        (info) => {
            const target = info?.target || info;
            animate(
                target,
                { opacity: [0, 1], y: [22, 0] },
                { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
            );
        },
        { margin: "0px 0px -30px 0px" }
    );
}
