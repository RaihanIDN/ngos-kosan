const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionLib = null;

async function loadMotion() {
    if (reduceMotion) return null;
    if (motionLib) return motionLib;
    try {
        motionLib = await import("https://cdn.jsdelivr.net/npm/motion@latest/+esm");
        return motionLib;
    } catch (err) {
        console.warn("Motion CDN gagal dimuat, lanjut tanpa animasi:", err);
        return null;
    }
}

export async function initGlobalAnimations() {
    const motion = await loadMotion();
    if (!motion) return;

    const { animate, inView, scroll } = motion;
    document.documentElement.classList.add("js-motion-ready");

    const progressBar = document.getElementById("scrollProgress");
    if (progressBar) {
        scroll(animate(progressBar, { scaleX: [0, 1] }, { ease: "linear" }));
    }

    document.querySelectorAll(".hero-animate").forEach((el, index) => {
        animate(
            el,
            { opacity: [0, 1], y: [22, 0] },
            { duration: 0.48, delay: index * 0.07, easing: [0.22, 1, 0.36, 1] }
        );
    });

    inView(".feature-card", (info) => {
        const target = info?.target || info;
        animate(target, { opacity: [0, 1], y: [20, 0] }, { duration: 0.4, easing: [0.22, 1, 0.36, 1] });
    }, { margin: "0px 0px -30px 0px" });
}

export async function observeKostCards() {
    const cards = document.querySelectorAll("#kostListContainer .property-card");
    const motion = await loadMotion();
    if (!motion) {
        cards.forEach(c => (c.style.opacity = "1"));
        return;
    }

    const { animate, inView } = motion;
    inView("#kostListContainer .property-card", (info) => {
        const target = info?.target || info;
        animate(target, { opacity: [0, 1], y: [22, 0] }, { duration: 0.42, easing: [0.22, 1, 0.36, 1] });
    }, { margin: "0px 0px -30px 0px" });
}
