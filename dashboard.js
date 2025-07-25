/**
 * @fileoverview Main client-side script for the Health Hub dashboard.
 * Handles Firebase authentication, data fetching, UI updates, and user interactions.
 * @version 3.2.0
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- MODULE SCOPE VARIABLES ---

    // Firebase & Gemini Configuration
    const { auth, db, onAuthStateChanged, signOut, sendPasswordResetEmail, doc, setDoc, onSnapshot, increment, arrayUnion, updateDoc, getDocs, collection } = window.firebaseInstances;
    const GEMINI_API_KEY = "AIzaSyDw7690FDGPcdHiFo1dHdaJwrfk9cyDpZw";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    // DOM Element Cache for performance
    const dom = {
        body: document.body,
        loadingSpinner: document.getElementById('loading-spinner'),
        dashboardContainer: document.getElementById('dashboard-container'),
        mainWelcomeMessage: document.getElementById('main-welcome-message'),
        todayGoalHighlight: document.getElementById('today-goal-highlight'),
        profileWelcome: document.getElementById('profile-welcome'),
        userAvatar: document.getElementById('user-avatar'),
        profileButton: document.getElementById('profile-button'),
        calendarButton: document.getElementById('calendar-button'),
        dateDisplay: document.getElementById('date-display'),
        consumedCaloriesCard: document.getElementById('consumed-calories-card'),
        consumedCaloriesSummary: document.getElementById('consumed-calories-summary'),
        goalCaloriesSummary: document.getElementById('goal-calories-summary'),
        burnedCaloriesSummary: document.getElementById('burned-calories-summary'),
        netCaloriesSummary: document.getElementById('net-calories-summary'),
        progressContainer: document.getElementById('progress-container'),
        goalCompletedContainer: document.getElementById('goal-completed-container'),
        calorieSummaryText: document.getElementById('calorie-summary-text'),
        calorieProgressBar: document.getElementById('calorie-progress-bar'),
        calorieProgressPercentage: document.getElementById('calorie-progress-percentage'),
        addGlassBtn: document.getElementById('add-glass-btn'),
        removeGlassBtn: document.getElementById('remove-glass-btn'),
        waterGlassCount: document.getElementById('water-glass-count'),
        waterIntakeSummary: document.getElementById('water-intake-summary'),
        waterLevel: document.getElementById('water-level'),
        splashAnimation: document.getElementById('splash-animation'),
        weightInput: document.getElementById('weight-input'),
        logWeightBtn: document.getElementById('log-weight-btn'),
        weightCard: document.getElementById('weight-card'),
        logWeightContainer: document.getElementById('log-weight-container'),
        miniWeightGraphContainer: document.getElementById('mini-weight-graph-container'),
        miniWeightChartCtx: document.getElementById('mini-weight-chart') ? document.getElementById('mini-weight-chart').getContext('2d') : null,
        burnedCaloriesInput: document.getElementById('burned-calories-input'),
        logBurnedCaloriesBtn: document.getElementById('log-burned-calories-btn'),
        foodLogForm: document.getElementById('food-log-form'),
        foodItemInput: document.getElementById('food-item-input'),
        mealTypeSelect: document.getElementById('meal-type-select'),
        logFoodBtn: document.getElementById('log-food-btn'),
        foodLogError: document.getElementById('food-log-error'),
        
        // Updated Profile/Settings Modal elements
        profileModal: document.getElementById('profile-modal'),
        closeProfileModalBtn: document.getElementById('close-profile-modal-btn'),
        profileModalAvatar: document.getElementById('profile-modal-avatar'),
        profileModalName: document.getElementById('profile-modal-name'),
        editNameBtn: document.getElementById('edit-name-btn'),
        settingsForm: document.getElementById('settings-form'),
        preferencesBtn: document.getElementById('preferences-btn'),
        preferencesInputs: document.getElementById('preferences-inputs'),
        nameInput: document.getElementById('name-input'),
        calorieGoalInput: document.getElementById('calorie-goal-input'),
        waterGoalInput: document.getElementById('water-goal-input'),
        glassSizeInput: document.getElementById('glass-size-input'),
        saveChangesBtn: document.getElementById('save-changes-btn'),
        premiumBtn: document.getElementById('premium-btn'),
        premiumDetails: document.getElementById('premium-details'),
        premiumExpiryDate: document.getElementById('premium-expiry-date'),
        resetPasswordBtn: document.getElementById('reset-password-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        
        foodLogModal: document.getElementById('food-log-modal'),
        closeFoodLogModalBtn: document.getElementById('close-food-log-modal-btn'),
        foodLogModalList: document.getElementById('food-log-modal-list'),
        foodLoggingModal: document.getElementById('food-logging-modal'),
        closeFoodLoggingModalBtn: document.getElementById('close-food-logging-modal-btn'),
        logFoodBtnDesktop: document.getElementById('log-food-btn-desktop'),
        logFoodBtnMobile: document.getElementById('log-food-btn-mobile'),
        weightHistoryModal: document.getElementById('weight-history-modal'),
        closeWeightHistoryModalBtn: document.getElementById('close-weight-history-modal-btn'),
        calendarModal: document.getElementById('calendar-modal'),
        monthYearDisplay: document.getElementById('month-year-display'),
        prevMonthBtn: document.getElementById('prev-month-btn'),
        nextMonthBtn: document.getElementById('next-month-btn'),
        calendarGrid: document.getElementById('calendar-grid'),
        presentDayBtn: document.getElementById('present-day-btn'),
        macrosCard: document.getElementById('macros-card'),
        macrosLegend: document.getElementById('macros-legend'),
        macrosChart: document.getElementById('macros-chart'),
        waterChart: document.getElementById('water-chart'),
        weightHistoryChart: document.getElementById('weight-history-chart'),
        settingsTab: document.querySelector('[data-section="settings"]'), // Desktop settings tab
        premiumNavIcon: document.getElementById('premium-nav-icon'),
        profileCrownIcon: document.getElementById('profile-crown-icon'),
        scrollIndicator: document.getElementById('scroll-indicator'),
        popupNotification: document.getElementById('popup-notification'),
    };

    // Application State
    let userUid = null;
    let dailyDataUnsubscribe = null;
    let userDataUnsubscribe = null;
    let userSettings = { name: 'User', calorieGoal: 2000, waterGoalLiters: 2, glassSizeMl: 250, isPremium: true };
    let dailyData = {};
    let selectedDate = new Date();
    let calendarDate = new Date();
    let charts = { macros: null, water: null, weight: null, miniWeight: null };

    // --- UTILITY FUNCTIONS ---

    function getFormattedDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatDisplayDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const showLoading = (isLoading) => {
        if (dom.loadingSpinner) dom.loadingSpinner.style.display = isLoading ? 'flex' : 'none';
        if (dom.dashboardContainer) dom.dashboardContainer.classList.toggle('hidden', isLoading);
    };

    const updateInputStyles = () => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], select, textarea');
        inputs.forEach(input => {
            if (input.value && input.value.length > 0 && input.value !== "") {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    };
    
    const showPopup = (message, isError = false) => {
        if (!dom.popupNotification) return;
        dom.popupNotification.querySelector('p').textContent = message;
        dom.popupNotification.classList.toggle('bg-red-500', isError);
        dom.popupNotification.classList.toggle('bg-green-500', !isError);
        dom.popupNotification.classList.remove('opacity-0', '-translate-y-4');
        
        setTimeout(() => {
            dom.popupNotification.classList.add('opacity-0', '-translate-y-4');
        }, 3000);
    };

    // --- AUTHENTICATION & INITIALIZATION ---

    function initialize() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userUid = user.uid;
                if (dom.dateDisplay) dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
                listenToUserData();
                listenToDailyData(getFormattedDate(selectedDate));
                checkApiKey();
                bindEventListeners();
                updateInputStyles();
                showLoading(false);
                if (window.lucide) lucide.createIcons();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    const checkApiKey = () => {
        if (!dom.logFoodBtn || !dom.foodLogError) return;
        if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("YOUR")) {
            dom.logFoodBtn.disabled = true;
            dom.logFoodBtn.textContent = 'API Key Needed';
            dom.foodLogError.textContent = 'Please add your Gemini API Key in dashboard.js to enable nutrition analysis.';
            dom.foodLogError.classList.remove('hidden');
        }
    };

    // --- REAL-TIME DATA LISTENERS ---

    const listenToUserData = () => {
        if (userDataUnsubscribe) userDataUnsubscribe();
        const userDocRef = doc(db, 'users', userUid);
        userDataUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const userName = data.name || 'User';
                if (dom.profileWelcome) dom.profileWelcome.textContent = `Hi ${userName.split(' ')[0]}`;
                if (dom.mainWelcomeMessage) dom.mainWelcomeMessage.textContent = `Welcome back, ${userName.split(' ')[0]}!`;
                if (dom.userAvatar) dom.userAvatar.textContent = userName.charAt(0).toUpperCase();
                
                // Update new profile modal elements
                if (dom.profileModalAvatar) dom.profileModalAvatar.textContent = userName.charAt(0).toUpperCase();
                if (dom.profileModalName) dom.profileModalName.textContent = userName;

                userSettings = {
                    name: data.name || 'User',
                    calorieGoal: data.calorieGoal || 2000,
                    waterGoalLiters: data.waterGoalLiters || 2,
                    glassSizeMl: data.glassSizeMl || 250,
                    isPremium: data.isPremium || true, // Default to true for demo
                };
                updateUI();
            }
        });
    };

    const listenToDailyData = (dateStr) => {
        if (dailyDataUnsubscribe) dailyDataUnsubscribe();
        const dailyDocRef = doc(db, 'users', userUid, 'dailyData', dateStr);
        dailyDataUnsubscribe = onSnapshot(dailyDocRef, (docSnap) => {
            dailyData = docSnap.exists() ? docSnap.data() : {};
            updateUI();
        });
    };

    // --- UI UPDATE FUNCTIONS ---

    const updateUI = () => {
        const isPresentDay = getFormattedDate(selectedDate) === getFormattedDate(new Date());
        if (dom.presentDayBtn) dom.presentDayBtn.classList.toggle('hidden', isPresentDay);
        
        const inputsToToggle = [dom.addGlassBtn, dom.removeGlassBtn, dom.logWeightBtn, dom.logFoodBtnDesktop, dom.logFoodBtnMobile, dom.weightInput, dom.burnedCaloriesInput, dom.logBurnedCaloriesBtn, dom.foodItemInput, dom.mealTypeSelect];
        inputsToToggle.forEach(input => {
            if (input) input.disabled = !isPresentDay;
        });
        if (dom.foodLogForm) dom.foodLogForm.classList.toggle('opacity-50', !isPresentDay);

        const foodLog = dailyData.foodLog || [];
        const burnedCalories = dailyData.burnedCalories || 0;
        const waterLog = dailyData.waterLog || [];
        const totalWaterMl = waterLog.reduce((acc, log) => acc + (log && log.amount ? log.amount : 0), 0);
        const consumedTotals = foodLog.reduce((acc, item) => {
            if (item && item.nutrition) {
                acc.calories += (item.nutrition.calories || 0);
                acc.protein += (item.nutrition.protein || 0);
                acc.carbs += (item.nutrition.carbohydrates || 0);
                acc.fats += (item.nutrition.fat || 0);
            }
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });
        
        const netCals = Math.round(consumedTotals.calories - burnedCalories);
        const caloriePercentage = userSettings.calorieGoal > 0 ? Math.round((consumedTotals.calories / userSettings.calorieGoal) * 100) : 0;

        if (dom.consumedCaloriesSummary) dom.consumedCaloriesSummary.textContent = `${Math.round(consumedTotals.calories)} kcal`;
        if (dom.goalCaloriesSummary) dom.goalCaloriesSummary.textContent = `${userSettings.calorieGoal} kcal`;
        if (dom.todayGoalHighlight) dom.todayGoalHighlight.textContent = `${userSettings.calorieGoal} Kcal`;
        if (dom.burnedCaloriesSummary) dom.burnedCaloriesSummary.textContent = `${Math.round(burnedCalories)} kcal`;
        if (dom.netCaloriesSummary) dom.netCaloriesSummary.textContent = `${netCals} kcal`;
        
        if (caloriePercentage >= 100) {
            dom.progressContainer.classList.add('hidden');
            dom.goalCompletedContainer.classList.remove('hidden');
            dom.calorieProgressBar.classList.add('completed');
            dom.calorieProgressBar.style.width = '100%';
        } else {
            dom.progressContainer.classList.remove('hidden');
            dom.goalCompletedContainer.classList.add('hidden');
            dom.calorieProgressBar.classList.remove('completed');
            dom.calorieProgressBar.style.width = `${caloriePercentage}%`;
        }
        
        if (dom.calorieSummaryText) dom.calorieSummaryText.textContent = `${Math.round(consumedTotals.calories)} / ${userSettings.calorieGoal} kcal`;
        if (dom.calorieProgressPercentage) dom.calorieProgressPercentage.textContent = `${caloriePercentage}%`;
        
        const glassCount = userSettings.glassSizeMl > 0 ? Math.round(totalWaterMl / userSettings.glassSizeMl) : 0;
        if (dom.waterGlassCount) dom.waterGlassCount.textContent = `${glassCount} ${glassCount === 1 ? 'glass' : 'glasses'}`;
        if (dom.waterIntakeSummary) dom.waterIntakeSummary.textContent = `${(totalWaterMl / 1000).toFixed(1)} / ${userSettings.waterGoalLiters.toFixed(1)} L`;

        if (dom.macrosChart) updateMacrosChart(consumedTotals.protein, consumedTotals.carbs, consumedTotals.fats);
        updateWaterVisuals(waterLog, totalWaterMl);
        updateFoodLogModal(foodLog);

        const hasWeightForToday = dailyData.weight && dailyData.weight > 0;
        if (dom.logWeightContainer && dom.miniWeightGraphContainer) {
            if (hasWeightForToday && getFormattedDate(selectedDate) === getFormattedDate(new Date())) {
                dom.logWeightContainer.classList.add('hidden');
                dom.miniWeightGraphContainer.classList.remove('hidden');
                dom.weightCard.classList.add('card-clickable');
                renderMiniWeightChart();
            } else {
                dom.logWeightContainer.classList.remove('hidden');
                dom.miniWeightGraphContainer.classList.add('hidden');
                dom.weightCard.classList.remove('card-clickable');
            }
        }
        
        // Premium UI
        if (dom.premiumNavIcon) dom.premiumNavIcon.classList.toggle('hidden', !userSettings.isPremium);
        if (dom.profileCrownIcon) dom.profileCrownIcon.classList.toggle('hidden', !userSettings.isPremium);
        if (userSettings.isPremium) {
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 6);
            if (dom.premiumExpiryDate) dom.premiumExpiryDate.textContent = formatDisplayDate(expiryDate);
        }
    };

    const updateMacrosChart = (protein, carbs, fat) => {
        if (!dom.macrosChart) return;
        const ctx = dom.macrosChart.getContext('2d');
        if (charts.macros) charts.macros.destroy();
        const total = protein + carbs + fat;

        const data = total > 0 ? [fat, protein, carbs] : [1, 1, 1];
        const labels = ['Fat', 'Protein', 'Carbs'];
        const colors = ['#facc15', '#3b82f6', '#ef4444'];

        charts.macros = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ 
                    data: data, 
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 8,
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                cutout: '75%',
                plugins: { 
                    legend: { display: false },
                    tooltip: { 
                        enabled: total > 0,
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) { label += context.parsed.toFixed(1) + 'g'; }
                                return label;
                            }
                        }
                    }
                } 
            }
        });

        if (dom.macrosLegend) {
            dom.macrosLegend.innerHTML = '';
            if (total > 0) {
                labels.forEach((label, index) => {
                    const value = data[index];
                    const percentage = ((value / total) * 100).toFixed(0);
                    const legendItemHTML = `
                        <div class="flex items-center justify-between text-sm">
                            <div class="flex items-center gap-3">
                                <span class="h-3 w-3 rounded-full" style="background-color: ${colors[index]}"></span>
                                <span class="font-semibold text-main">${label}</span>
                                <span class="text-sub">${value.toFixed(0)}g</span>
                            </div>
                            <span class="font-bold text-main">${percentage}%</span>
                        </div>
                    `;
                    dom.macrosLegend.insertAdjacentHTML('beforeend', legendItemHTML);
                });
            } else {
                 dom.macrosLegend.innerHTML = '<p class="text-center text-sub">No macro data for this day.</p>';
            }
        }
    };
    
    const updateWaterVisuals = (waterLog = [], totalWaterMl) => {
        if (dom.waterLevel) {
            const waterGoalMl = userSettings.waterGoalLiters * 1000;
            const waterPercentage = waterGoalMl > 0 ? Math.min(100, (totalWaterMl / waterGoalMl) * 100) : 0;
            dom.waterLevel.style.height = `${waterPercentage}%`;
        }

        if (dom.waterChart) {
            const ctx = dom.waterChart.getContext('2d');
            if (charts.water) charts.water.destroy();
            const validLog = (waterLog || []).filter(log => log && log.time && typeof log.time.seconds === 'number');
            const sortedLog = validLog.sort((a, b) => a.time.seconds - b.time.seconds);
            let cumulativeAmount = 0;
            const chartData = sortedLog.map(log => {
                cumulativeAmount += log.amount;
                return { x: new Date(log.time.seconds * 1000), y: cumulativeAmount };
            });

            const dayStart = new Date(selectedDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(selectedDate);
            dayEnd.setHours(23, 59, 59, 999);

            charts.water = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{ 
                        label: 'Intake', 
                        data: chartData, 
                        borderColor: 'rgba(59, 130, 246, 0.8)',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 2,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)'
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                        x: { display: false, min: dayStart, max: dayEnd },
                        y: { display: false, min: 0, max: userSettings.waterGoalLiters * 1000 }
                    },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }
                }
            });
        }
    };

    const updateFoodLogModal = (foodLog) => {
        if (!dom.foodLogModalList) return;
        dom.foodLogModalList.innerHTML = '';
        if (foodLog && foodLog.length > 0) {
            foodLog.forEach(item => {
                if (item && item.nutrition) {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'p-3 bg-border-color-dark rounded-lg';
                    itemEl.innerHTML = `<div><p class="font-semibold">${item.foodItem} <span class="text-sm font-normal text-sub">(${item.mealType})</span></p><p class="text-xs text-sub">~${Math.round(item.nutrition.calories)} kcal | P: ${item.nutrition.protein}g | C: ${item.nutrition.carbohydrates}g | F: ${item.nutrition.fat}g</p></div>`;
                    dom.foodLogModalList.appendChild(itemEl);
                }
            });
        } else {
            dom.foodLogModalList.innerHTML = `<p class="text-center text-sub mt-4">No food logged for this day.</p>`;
        }
    };
    
    const fetchWeightHistory = async () => {
        const querySnapshot = await getDocs(collection(db, 'users', userUid, 'dailyData'));
        const history = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.weight) history.push({ date: doc.id, weight: data.weight });
        });
        return history.sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const renderMiniWeightChart = async () => {
        if (!dom.miniWeightChartCtx) return;
        if (charts.miniWeight) charts.miniWeight.destroy();

        const history = await fetchWeightHistory();
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const monthHistory = history.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === year && itemDate.getMonth() === month;
        });

        if (monthHistory.length < 2) {
            const ctx = dom.miniWeightChartCtx;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = "14px Inter";
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.textAlign = "center";
            ctx.fillText("Log weight again to see a trend.", ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const chartData = monthHistory.map(item => ({ x: new Date(item.date), y: item.weight }));
        
        const gradient = dom.miniWeightChartCtx.createLinearGradient(0, 0, 0, 100);
        gradient.addColorStop(0, 'rgba(250, 204, 21, 0.5)');
        gradient.addColorStop(1, 'rgba(250, 204, 21, 0)');

        charts.miniWeight = new Chart(dom.miniWeightChartCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Weight',
                    data: chartData,
                    borderColor: 'rgba(250, 204, 21, 1)',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(250, 204, 21, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    x: { display: false }, 
                    y: { 
                        display: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { 
                            color: 'rgba(255, 255, 255, 0.5)',
                            font: { size: 10 },
                            maxTicksLimit: 4
                        }
                    } 
                },
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { 
                        enabled: true,
                        callbacks: {
                            title: function(context) {
                                return formatDisplayDate(new Date(context[0].parsed.x));
                            },
                            label: function(context) {
                                return `Weight: ${context.parsed.y} kg`;
                            }
                        }
                    } 
                },
                animation: { duration: 500 }
            }
        });
    };
    
    const updateWeightHistoryChart = (history = []) => {
        if (!dom.weightHistoryChart) return;
        const ctx = dom.weightHistoryChart.getContext('2d');
        if (charts.weight) charts.weight.destroy();
        const chartData = history.map(item => ({ x: new Date(item.date), y: item.weight }));

        charts.weight = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{ 
                    label: 'Weight (kg)', 
                    data: chartData, 
                    borderColor: '#a855f7', 
                    backgroundColor: 'rgba(168, 85, 247, 0.2)', 
                    fill: true, 
                    tension: 0.1 
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { 
                        type: 'time', 
                        time: { 
                            unit: 'day', 
                            tooltipFormat: 'MMM dd, yyyy' 
                        }, 
                        grid: { color: 'rgba(255,255,255,0.1)' }, 
                        ticks: { color: '#A1A1AA' } 
                    },
                    y: { 
                        beginAtZero: false, 
                        grid: { color: 'rgba(255,255,255,0.1)' }, 
                        ticks: { 
                            color: '#A1A1AA', 
                            callback: (value) => `${value} kg` 
                        } 
                    }
                },
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { 
                        callbacks: { 
                            label: (context) => `${context.raw.y} kg` 
                        } 
                    } 
                }
            }
        });
    };

    // --- FIREBASE WRITE FUNCTIONS ---
    const updateDailyData = async (payload) => {
        if (!userUid) return;
        const dateStr = getFormattedDate(new Date());
        const dailyDocRef = doc(db, 'users', userUid, 'dailyData', dateStr);
        await setDoc(dailyDocRef, payload, { merge: true });
    };

    const saveUserSettings = async (settings) => {
        if (!userUid) return;
        const userDocRef = doc(db, 'users', userUid);
        await setDoc(userDocRef, settings, { merge: true });
    };

    // --- EVENT HANDLERS & BINDING ---
    
    const handleProfileOpen = () => {
        if (dom.nameInput) dom.nameInput.value = userSettings.name;
        if (dom.calorieGoalInput) dom.calorieGoalInput.value = userSettings.calorieGoal;
        if (dom.waterGoalInput) dom.waterGoalInput.value = userSettings.waterGoalLiters;
        if (dom.glassSizeInput) dom.glassSizeInput.value = userSettings.glassSizeMl;
        if (dom.profileModal) dom.profileModal.classList.remove('hidden');
        if (dom.preferencesInputs) dom.preferencesInputs.classList.add('hidden');
        if (dom.premiumDetails) dom.premiumDetails.classList.add('hidden');
        dom.body.setAttribute('data-no-scroll', 'true');
        updateInputStyles();
    };
    
    const handleProfileClose = () => {
        if (dom.profileModal) dom.profileModal.classList.add('hidden');
        dom.body.removeAttribute('data-no-scroll');
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        const settingsToSave = {
            calorieGoal: Number(dom.calorieGoalInput.value),
            waterGoalLiters: Number(dom.waterGoalInput.value),
            glassSizeMl: Number(dom.glassSizeInput.value),
        };

        if (dom.nameInput.value !== userSettings.name) {
            settingsToSave.name = dom.nameInput.value;
        }

        await saveUserSettings(settingsToSave);
        showPopup('Preferences saved successfully!');
        if (dom.preferencesInputs) dom.preferencesInputs.classList.add('hidden');
    };

    const handleLogWeight = (e) => {
        e.stopPropagation();
        if (dom.weightInput.value) {
            const weight = parseFloat(dom.weightInput.value);
            if (weight > 0) { updateDailyData({ weight }); dom.weightInput.value = ''; updateInputStyles(); }
        }
    };

    const handleLogBurnedCalories = () => {
        if(dom.burnedCaloriesInput.value) {
            const calories = parseInt(dom.burnedCaloriesInput.value);
            if (calories > 0) { updateDailyData({ burnedCalories: increment(calories) }); dom.burnedCaloriesInput.value = ''; updateInputStyles(); }
        }
    };

    const handleFoodLogSubmit = async (e) => {
        e.preventDefault();
        const foodItem = dom.foodItemInput.value;
        if (!foodItem) return;
        dom.logFoodBtn.disabled = true; 
        dom.logFoodBtn.innerHTML = '<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>'; 
        if(dom.foodLogError) dom.foodLogError.classList.add('hidden');
        try {
            const prompt = `Analyze the nutritional content for "${foodItem}". Provide a valid JSON object with ONLY these keys: "calories", "protein", "carbohydrates", "fat". The values must be numbers. Do not include any text, just the JSON.`;
            const response = await fetch(GEMINI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            if (!response.ok) throw new Error((await response.json()).error.message);
            const result = await response.json();
            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0] || !result.candidates[0].content.parts[0].text) {
                throw new Error("Invalid response from API.");
            }
            const jsonText = result.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            const nutritionData = JSON.parse(jsonText);
            const newLogEntry = { foodItem, mealType: dom.mealTypeSelect.value, nutrition: { calories: Number(nutritionData.calories) || 0, protein: Number(nutritionData.protein) || 0, carbohydrates: Number(nutritionData.carbohydrates) || 0, fat: Number(nutritionData.fat) || 0 } };
            await updateDailyData({ foodLog: arrayUnion(newLogEntry) });
            dom.foodLogForm.reset();
            updateInputStyles();
            dom.foodLoggingModal.classList.add('hidden');
        } catch (error) {
            if(dom.foodLogError) {
                dom.foodLogError.textContent = `Error: ${error.message}`;
                dom.foodLogError.classList.remove('hidden');
            }
        } finally {
            dom.logFoodBtn.disabled = false; 
            dom.logFoodBtn.textContent = 'Analyze & Log'; 
            checkApiKey();
        }
    };

    const openWeightHistoryModal = async () => {
        if (!userUid) return;
        try {
            const history = await fetchWeightHistory();
            if (dom.weightHistoryChart) updateWeightHistoryChart(history);
            if (dom.weightHistoryModal) dom.weightHistoryModal.classList.remove('hidden');
        } catch (error) {
            console.error("Error fetching/displaying weight history:", error);
        }
    };
    
    // --- CALENDAR LOGIC ---
    const renderCalendar = (year, month) => {
        if (!dom.calendarGrid || !dom.monthYearDisplay) return;
        dom.calendarGrid.innerHTML = '';
        dom.monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) {
            dom.calendarGrid.insertAdjacentHTML('beforeend', '<div></div>');
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = getFormattedDate(date);
            const isSelected = dateStr === getFormattedDate(selectedDate);
            const isToday = dateStr === getFormattedDate(new Date());

            const dayEl = document.createElement('button');
            dayEl.textContent = day;
            dayEl.className = `calendar-day p-2 rounded-full cursor-pointer ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`;
            dayEl.dataset.date = dateStr;
            dom.calendarGrid.appendChild(dayEl);
        }
    };
    
    const handleFirstScroll = () => {
        if (dom.scrollIndicator) dom.scrollIndicator.classList.add('hidden');
        localStorage.setItem('hasScrolled', 'true');
    };

    function bindEventListeners() {
        if (dom.profileButton) dom.profileButton.addEventListener('click', handleProfileOpen);
        if (dom.closeProfileModalBtn) dom.closeProfileModalBtn.addEventListener('click', handleProfileClose);
        if (dom.editNameBtn) dom.editNameBtn.addEventListener('click', () => {
            if (dom.preferencesInputs) dom.preferencesInputs.classList.remove('hidden');
            dom.nameInput.focus();
        });
        if (dom.preferencesBtn) dom.preferencesBtn.addEventListener('click', () => {
            if (dom.preferencesInputs) dom.preferencesInputs.classList.toggle('hidden');
        });
        if (dom.settingsTab) dom.settingsTab.addEventListener('click', (e) => {
            e.preventDefault();
            handleProfileOpen();
        });
        if (dom.premiumBtn) dom.premiumBtn.addEventListener('click', () => {
            if (dom.premiumDetails) dom.premiumDetails.classList.toggle('hidden');
        });
        
        if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', () => signOut(auth));
        if (dom.resetPasswordBtn) dom.resetPasswordBtn.addEventListener('click', async () => {
            try {
                await sendPasswordResetEmail(auth, auth.currentUser.email);
                showPopup('Password reset email sent!');
            } catch (error) {
                showPopup(error.message, true);
            }
        });
        
        if (dom.presentDayBtn) dom.presentDayBtn.addEventListener('click', () => {
            selectedDate = new Date();
            dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
            listenToDailyData(getFormattedDate(selectedDate));
        });

        if (dom.settingsForm) dom.settingsForm.addEventListener('submit', handleSettingsSave);
        if (dom.consumedCaloriesCard) dom.consumedCaloriesCard.addEventListener('click', () => dom.foodLogModal.classList.remove('hidden'));
        if (dom.closeFoodLogModalBtn) dom.closeFoodLogModalBtn.addEventListener('click', () => dom.foodLogModal.classList.add('hidden'));
        
        const openFoodLogger = () => dom.foodLoggingModal.classList.remove('hidden');
        if (dom.logFoodBtnDesktop) dom.logFoodBtnDesktop.addEventListener('click', openFoodLogger);
        if (dom.logFoodBtnMobile) dom.logFoodBtnMobile.addEventListener('click', openFoodLogger);
        if (dom.closeFoodLoggingModalBtn) dom.closeFoodLoggingModalBtn.addEventListener('click', () => dom.foodLoggingModal.classList.add('hidden'));
        
        if (dom.weightCard) dom.weightCard.addEventListener('click', () => {
            if(dom.miniWeightGraphContainer.classList.contains('hidden') === false) {
                openWeightHistoryModal();
            }
        });
        if (dom.closeWeightHistoryModalBtn) dom.closeWeightHistoryModalBtn.addEventListener('click', () => dom.weightHistoryModal.classList.add('hidden'));

        if (dom.addGlassBtn) dom.addGlassBtn.addEventListener('click', () => {
            updateDailyData({ waterLog: arrayUnion({ time: new Date(), amount: userSettings.glassSizeMl }) });
            if (dom.splashAnimation) {
                dom.splashAnimation.classList.add('animate');
                setTimeout(() => {
                    dom.splashAnimation.classList.remove('animate');
                }, 500);
            }
        });
        if (dom.removeGlassBtn) dom.removeGlassBtn.addEventListener('click', async () => {
            if (dailyData.waterLog && dailyData.waterLog.length > 0) {
                const dateStr = getFormattedDate(new Date());
                const sortedLog = (dailyData.waterLog || [])
                    .filter(log => log && log.time && typeof log.time.seconds === 'number')
                    .sort((a, b) => a.time.seconds - b.time.seconds);
                sortedLog.pop();
                await updateDoc(doc(db, 'users', userUid, 'dailyData', dateStr), { waterLog: sortedLog });
            }
        });
        if (dom.logWeightBtn) dom.logWeightBtn.addEventListener('click', handleLogWeight);
        if (dom.logBurnedCaloriesBtn) dom.logBurnedCaloriesBtn.addEventListener('click', handleLogBurnedCalories);
        if (dom.foodLogForm) dom.foodLogForm.addEventListener('submit', handleFoodLogSubmit);

        if (dom.calendarButton) dom.calendarButton.addEventListener('click', () => {
            calendarDate = new Date(selectedDate);
            renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
            dom.calendarModal.classList.remove('hidden');
        });
        if (dom.prevMonthBtn) dom.prevMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
        });
        if (dom.nextMonthBtn) dom.nextMonthBtn.addEventListener('click', () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
        });
        if (dom.calendarGrid) dom.calendarGrid.addEventListener('click', (e) => {
            if (e.target.matches('.calendar-day')) {
                selectedDate = new Date(e.target.dataset.date + 'T12:00:00');
                dom.dateDisplay.textContent = formatDisplayDate(selectedDate);
                listenToDailyData(getFormattedDate(selectedDate));
                dom.calendarModal.classList.add('hidden');
            }
        });

        const inputs = document.querySelectorAll('input[type="text"], input[type="number"], select');
        inputs.forEach(input => {
            input.addEventListener('input', updateInputStyles);
            input.addEventListener('blur', updateInputStyles);
        });
        
        // Scroll indicator listener
        if (!localStorage.getItem('hasScrolled')) {
            if (dom.scrollIndicator) dom.scrollIndicator.classList.remove('hidden');
            window.addEventListener('scroll', handleFirstScroll, { once: true });
        }
    }

    // --- START THE APP ---
    initialize();

});
