/**
 * @fileoverview Handles the Nutrition Lookup feature in the Food Planner section.
 * @version 1.0.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    
    // Ensure the global namespace exists
    window.healthHub = window.healthHub || {};

    const dom = {
        searchInput: document.getElementById('nutrition-search-input'),
        searchBtn: document.getElementById('nutrition-search-btn'),
        resultsContainer: document.getElementById('nutrition-results'),
    };

    const GEMINI_API_KEY = "AIzaSyDw7690FDGPcdHiFo1dHdaJwrfk9cyDpZw";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const handleNutritionSearch = async () => {
        const query = dom.searchInput.value;
        if (!query) return;

        dom.resultsContainer.innerHTML = '<div class="text-center text-sub">Analyzing...</div>';
        dom.searchBtn.disabled = true;

        try {
            const prompt = `Analyze the nutritional content for "${query}". Provide a valid JSON object with ONLY these keys: "calories", "protein", "carbohydrates", "fat". The values must be numbers. Do not include any text, just the JSON.`;
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error('Failed to fetch nutritional data.');

            const result = await response.json();
            const jsonText = result.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            const nutritionData = JSON.parse(jsonText);

            renderNutritionResults(query, nutritionData);

        } catch (error) {
            dom.resultsContainer.innerHTML = `<div class="text-red-400 text-center">Error: ${error.message}</div>`;
        } finally {
            dom.searchBtn.disabled = false;
        }
    };

    const renderNutritionResults = (foodItem, data) => {
        dom.resultsContainer.innerHTML = `
            <div class="card p-4">
                <h4 class="font-bold text-lg">${foodItem}</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-center">
                    <div><p class="font-bold text-xl">${data.calories || 0}</p><p class="text-sub text-sm">Calories</p></div>
                    <div><p class="font-bold text-xl">${data.protein || 0}g</p><p class="text-sub text-sm">Protein</p></div>
                    <div><p class="font-bold text-xl">${data.carbohydrates || 0}g</p><p class="text-sub text-sm">Carbs</p></div>
                    <div><p class="font-bold text-xl">${data.fat || 0}g</p><p class="text-sub text-sm">Fat</p></div>
                </div>
                <button id="log-from-lookup-btn" class="btn-secondary w-full mt-4">Log this Item</button>
            </div>
        `;
        
        document.getElementById('log-from-lookup-btn').addEventListener('click', () => {
            if (window.healthHub && typeof window.healthHub.logFoodItem === 'function') {
                window.healthHub.logFoodItem(foodItem, data);
                dom.resultsContainer.innerHTML = `<div class="text-green-400 text-center">Logged successfully!</div>`;
            } else {
                 dom.resultsContainer.innerHTML = `<div class="text-red-400 text-center">Error: Could not log item.</div>`;
            }
        });
    };

    if (dom.searchBtn) {
        dom.searchBtn.addEventListener('click', handleNutritionSearch);
    }
});
