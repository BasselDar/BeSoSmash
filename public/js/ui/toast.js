// public/js/ui/toast.js

// Uses globally available 'anime' from animejs
export function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message);

    const toast = document.createElement('div');
    toast.className = "bg-rose-600/90 text-white font-black px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.8)] border border-rose-400 backdrop-blur-md";
    toast.innerText = message;

    container.appendChild(toast);

    // Animate in
    anime({
        targets: toast,
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutExpo'
    });

    // Animate out
    setTimeout(() => {
        anime({
            targets: toast,
            translateY: -50,
            opacity: 0,
            duration: 400,
            easing: 'easeInExpo',
            complete: () => toast.remove()
        });
    }, 3000);
}
