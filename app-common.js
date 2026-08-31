const DEFAULT_CLASSES = ['Class 10-A', 'Class 10-B', 'Class 9-A'];

function formatIndiaDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date).toUpperCase();
}

function updateCurrentDateLabels() {
    document.querySelectorAll('.current-date').forEach((element) => { element.textContent = formatIndiaDate(); });
}

async function loadClassOptions(selectors = [], includeAll = false) {
    let classNames = DEFAULT_CLASSES;
    try {
        const response = await fetch('/api/classes');
        const data = response.ok ? await response.json() : null;
        if (Array.isArray(data?.classes) && data.classes.length) classNames = data.classes;
    } catch (error) {
        console.warn('Could not load classes from backend, using local classes.', error);
    }
    selectors.forEach((entry) => {
        const selector = typeof entry === 'string' ? entry : entry.selector;
        const addAll = typeof entry === 'string' ? includeAll : entry.includeAll;
        const select = document.querySelector(selector);
        if (!select) return;
        const selected = select.value;
        select.replaceChildren(...(addAll ? ['All classes'] : []).concat(classNames).map((className) => new Option(className, className)));
        if ([...select.options].some((option) => option.value === selected)) select.value = selected;
    });
    return classNames;
}

updateCurrentDateLabels();
setInterval(updateCurrentDateLabels, 60000);
