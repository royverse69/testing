/**
 * @fileoverview Handles the Recipe Generator and Cravings Solver in the Tools section.
 * @version 1.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    
    // Ensure the global namespace exists
    window.healthHub = window.healthHub || {};

    const dom = {
        tabs: document.getElementById('tools-tabs'),
        recipeTab: document.querySelector('[data-tab="recipe-generator"]'),
        cravingTab: document.querySelector('[data-tab="cravings-solver"]'),
        recipeContent: document.getElementById('recipe-generator-tab'),
        cravingContent: document.getElementById('cravings-solver-tab'),
        
        // Recipe Finder
        ingredientsInput: document.getElementById('recipe-ingredients-input'),
        findRecipesBtn: document.getElementById('find-recipes-btn'),
        clearRecipesBtn: document.getElementById('clear-recipes-btn'),
        recipeResults: document.getElementById('recipe-results'),

        // Cravings Solver
        cravingInput: document.getElementById('craving-input'),
        solveCravingBtn: document.getElementById('solve-craving-btn'),
        cravingResults: document.getElementById('craving-results'),
    };

    const GEMINI_API_KEY = "AIzaSyDw7690FDGPcdHiFo1dHdaJwrfk9cyDpZw";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // --- Tab Functionality ---
    const handleTabClick = (e) => {
        if (!e.target.matches('.tab-button')) return;

        // Deactivate all tabs and content
        dom.tabs.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Activate clicked tab and corresponding content
        e.target.classList.add('active');
        const tabId = e.target.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add('active');
    };

    // --- Recipe Generator ---
    const handleFindRecipes = async () => {
        const ingredients = dom.ingredientsInput.value;
        if (!ingredients) return;

        dom.recipeResults.innerHTML = '<div class="text-center text-sub">Finding recipes...</div>';
        dom.findRecipesBtn.disabled = true;

        try {
            const prompt = `Find 3 recipes using these ingredients: ${ingredients}. Provide a valid JSON array where each object has "title", "ingredients" (an array of strings), and "instructions" (an array of strings).`;
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error('Failed to fetch recipes.');
            
            const result = await response.json();
            const jsonText = result.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            const recipes = JSON.parse(jsonText);

            renderRecipes(recipes);

        } catch (error) {
            dom.recipeResults.innerHTML = `<div class="text-red-400 text-center">Error: ${error.message}</div>`;
        } finally {
            dom.findRecipesBtn.disabled = false;
        }
    };

    const renderRecipes = (recipes) => {
        dom.recipeResults.innerHTML = recipes.map(recipe => `
            <div class="card p-4">
                <h4 class="font-bold text-lg text-primary">${recipe.title}</h4>
                <div class="mt-2">
                    <h5 class="font-semibold">Ingredients:</h5>
                    <ul class="list-disc list-inside text-sub text-sm">
                        ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                <div class="mt-2">
                    <h5 class="font-semibold">Instructions:</h5>
                    <ol class="list-decimal list-inside text-sub text-sm">
                        ${recipe.instructions.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
            </div>
        `).join('');
    };

    const handleClearRecipes = () => {
        dom.ingredientsInput.value = '';
        dom.recipeResults.innerHTML = '';
    };

    // --- Cravings Solver ---
    const handleSolveCraving = async () => {
        const craving = dom.cravingInput.value;
        if (!craving) return;

        dom.cravingResults.innerHTML = '<div class="text-center text-sub">Finding alternatives...</div>';
        dom.solveCravingBtn.disabled = true;

        try {
            const prompt = `I'm craving ${craving}. Suggest 3 healthy alternatives with a brief explanation for each.`;
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error('Failed to fetch suggestions.');

            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            
            dom.cravingResults.innerHTML = `<div class="text-sub whitespace-pre-wrap">${text}</div>`;
            
            // Log the craving to Firebase
            if (window.healthHub && typeof window.healthHub.logCraving === 'function') {
                window.healthHub.logCraving(craving);
            }

        } catch (error) {
            dom.cravingResults.innerHTML = `<div class="text-red-400 text-center">Error: ${error.message}</div>`;
        } finally {
            dom.solveCravingBtn.disabled = false;
        }
    };

    // --- Event Listeners ---
    if (dom.tabs) dom.tabs.addEventListener('click', handleTabClick);
    if (dom.findRecipesBtn) dom.findRecipesBtn.addEventListener('click', handleFindRecipes);
    if (dom.clearRecipesBtn) dom.clearRecipesBtn.addEventListener('click', handleClearRecipes);
    if (dom.solveCravingBtn) dom.solveCravingBtn.addEventListener('click', handleSolveCraving);
});
/**
 * @fileoverview Standalone module for the health calculators functionality.
 * Handles UI interactions and calculations for the various health metrics.
 * @version 1.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- MAIN INITIALIZATION ---
    const accordionContainer = document.getElementById('health-calculators-container');
    if (!accordionContainer) {
        console.warn('Health calculator container not found. Aborting script.');
        return;
    }

    // --- UI HELPER FUNCTIONS ---

    /**
     * Toggles the accordion items.
     * @param {Event} e The click event.
     */
    const handleAccordionToggle = (e) => {
        const header = e.target.closest('.accordion-header');
        if (!header) return;

        const item = header.parentElement;
        const currentlyOpen = accordionContainer.querySelector('.accordion-item.open');

        // Close the currently open item if it's not the one being clicked
        if (currentlyOpen && currentlyOpen !== item) {
            currentlyOpen.classList.remove('open');
        }
        // Toggle the clicked item
        item.classList.toggle('open');
    };
    
    /**
     * Shows the result in a standardized format.
     * @param {HTMLElement} resultEl The element to display the result in.
     * @param {string} htmlContent The HTML content to display.
     */
    const showResult = (resultEl, htmlContent) => {
        resultEl.innerHTML = htmlContent;
        resultEl.classList.remove('hidden');
    };

    // --- CALCULATOR LOGIC ---

    // 1. BMI Calculator
    const initBmiCalculator = () => {
        const form = document.getElementById('bmi-form');
        const resultEl = document.getElementById('bmi-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#bmi-weight').value);
            const height = parseFloat(form.querySelector('#bmi-height').value);

            if (weight > 0 && height > 0) {
                const heightInMeters = height / 100;
                const bmi = weight / (heightInMeters * heightInMeters);
                const category = bmi < 18.5 ? "Underweight" : bmi < 24.9 ? "Normal weight" : bmi < 29.9 ? "Overweight" : "Obesity";
                showResult(resultEl, `<p class="label">Your BMI</p><p class="value">${bmi.toFixed(1)}</p><p class="text-sub">${category}</p>`);
            }
        });
    };

    // 2. BMR Calculator
    const initBmrCalculator = () => {
        const form = document.getElementById('bmr-form');
        const resultEl = document.getElementById('bmr-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#bmr-weight').value);
            const height = parseFloat(form.querySelector('#bmr-height').value);
            const age = parseInt(form.querySelector('#bmr-age').value);
            const gender = form.querySelector('#bmr-gender').value;

            if (weight > 0 && height > 0 && age > 0) {
                let bmr;
                if (gender === 'male') {
                    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
                } else {
                    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
                }
                showResult(resultEl, `<p class="label">Basal Metabolic Rate</p><p class="value">${bmr.toFixed(0)}</p><p class="text-sub">calories/day</p>`);
            }
        });
    };

    // 3. Body Fat Calculator
    const initBodyFatCalculator = () => {
        const form = document.getElementById('bodyfat-form');
        const resultEl = document.getElementById('bodyfat-result');
        const genderSelect = document.getElementById('bf-gender');
        const hipContainer = document.getElementById('bf-hip-container');
        if (!form) return;

        genderSelect.addEventListener('change', () => {
            hipContainer.classList.toggle('hidden', genderSelect.value === 'male');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const gender = genderSelect.value;
            const height = parseFloat(form.querySelector('#bf-height').value);
            const waist = parseFloat(form.querySelector('#bf-waist').value);
            const neck = parseFloat(form.querySelector('#bf-neck').value);
            let bodyFat;

            if (gender === 'male' && height > 0 && waist > 0 && neck > 0) {
                bodyFat = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
            } else if (gender === 'female' && height > 0 && waist > 0 && neck > 0) {
                const hip = parseFloat(form.querySelector('#bf-hip').value);
                if (hip > 0) {
                    bodyFat = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
                }
            }
            
            if (bodyFat && bodyFat > 0) {
                showResult(resultEl, `<p class="label">Estimated Body Fat</p><p class="value">${bodyFat.toFixed(1)}%</p>`);
            }
        });
    };
    
    // 4. Maintenance Calories Calculator
    const initMaintCalsCalculator = () => {
        const form = document.getElementById('maint-cals-form');
        const resultEl = document.getElementById('maint-cals-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const bmr = parseFloat(form.querySelector('#mc-bmr').value);
            const activity = parseFloat(form.querySelector('#mc-activity').value);
            if (bmr > 0) {
                const maintCals = bmr * activity;
                showResult(resultEl, `<p class="label">Maintenance Calories</p><p class="value">${maintCals.toFixed(0)}</p><p class="text-sub">calories/day</p>`);
            }
        });
    };

    // 5. Protein Intake Calculator
    const initProteinCalculator = () => {
        const form = document.getElementById('protein-form');
        const resultEl = document.getElementById('protein-result');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const weight = parseFloat(form.querySelector('#protein-weight').value);
            const goal = parseFloat(form.querySelector('#protein-goal').value);
            if (weight > 0) {
                const proteinIntake = weight * goal;
                showResult(resultEl, `<p class="label">Daily Protein Intake</p><p class="value">${proteinIntake.toFixed(0)}g</p><p class="text-sub">grams/day</p>`);
            }
        });
    };
    
    // 6. Period & Ovulation Calculator
    const initPeriodCalculator = () => {
        const form = document.getElementById('period-form');
        const resultEl = document.getElementById('period-result');
        if (!form) return;
        
        const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const lastDate = new Date(form.querySelector('#period-last-date').value + 'T00:00:00');
            const cycleLength = parseInt(form.querySelector('#period-cycle-length').value);

            if (lastDate && cycleLength > 0) {
                const nextPeriod = new Date(lastDate);
                nextPeriod.setDate(lastDate.getDate() + cycleLength);
                
                const ovulationDay = new Date(nextPeriod);
                ovulationDay.setDate(nextPeriod.getDate() - 14);
                
                const fertileStart = new Date(ovulationDay);
                fertileStart.setDate(ovulationDay.getDate() - 5);
                
                const fertileEnd = new Date(ovulationDay);
                fertileEnd.setDate(ovulationDay.getDate() + 1);

                showResult(resultEl, `
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                        <p class="font-semibold text-sub">Next Period:</p><p class="font-bold text-main text-right">${formatDate(nextPeriod)}</p>
                        <p class="font-semibold text-sub">Est. Ovulation:</p><p class="font-bold text-main text-right">${formatDate(ovulationDay)}</p>
                        <p class="font-semibold text-sub col-span-2 text-center mt-2">Fertile Window:</p>
                        <p class="col-span-2 text-center font-bold text-primary">${formatDate(fertileStart)} - ${formatDate(fertileEnd)}</p>
                    </div>
                `);
            }
        });
    };

    // --- EVENT LISTENERS & INITIALIZATIONS ---
    accordionContainer.addEventListener('click', handleAccordionToggle);

    initBmiCalculator();
    initBmrCalculator();
    initBodyFatCalculator();
    initMaintCalsCalculator();
    initProteinCalculator();
    initPeriodCalculator();

});
