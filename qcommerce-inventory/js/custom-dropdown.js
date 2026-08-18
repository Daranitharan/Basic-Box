// custom-dropdown.js — Reusable Custom Dropdown & Date Picker

// ── Custom Dropdown ──────────────────────────────────────────
class CustomDropdown {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options;
        this.selectedValue = options.defaultValue || '';
        this.isOpen = false;
        
        this.init();
    }

    init() {
        // Hide original select
        const originalSelect = this.element.querySelector('select');
        if (originalSelect) {
            originalSelect.style.display = 'none';
            this.originalSelect = originalSelect;
        }

        // Build custom dropdown
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown';
        
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-dropdown-trigger';
        trigger.innerHTML = `
            <span class="custom-dropdown-display${!this.selectedValue ? ' placeholder' : ''}">
                ${this.getDisplayText()}
            </span>
            <i class="fas fa-chevron-down custom-dropdown-arrow"></i>
        `;
        
        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';
        menu.innerHTML = `<div class="custom-dropdown-list">${this.buildOptions()}</div>`;
        
        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        
        // Insert after original select or replace element
        if (this.originalSelect) {
            this.originalSelect.parentNode.insertBefore(wrapper, this.originalSelect.nextSibling);
        } else {
            this.element.appendChild(wrapper);
        }
        
        this.wrapper = wrapper;
        this.trigger = trigger;
        this.menu = menu;
        this.arrow = trigger.querySelector('.custom-dropdown-arrow');
        this.display = trigger.querySelector('.custom-dropdown-display');
        
        this.attachEvents();
    }

    buildOptions() {
        let html = '';
        const options = this.options.options || [];
        
        if (this.originalSelect) {
            // Build from original select
            Array.from(this.originalSelect.options).forEach(opt => {
                const isSelected = opt.value === this.selectedValue;
                const icon = opt.dataset.icon || '';
                html += `
                    <div class="custom-dropdown-option${isSelected ? ' selected' : ''}${opt.value === '' ? ' placeholder' : ''}" 
                         data-value="${opt.value}">
                        ${icon ? `<i class="${icon}"></i>` : ''}
                        <span>${opt.textContent}</span>
                    </div>
                `;
            });
        } else {
            // Build from options array
            options.forEach(opt => {
                const value = typeof opt === 'object' ? opt.value : opt;
                const label = typeof opt === 'object' ? opt.label : opt;
                const icon = typeof opt === 'object' ? opt.icon : '';
                const isSelected = value === this.selectedValue;
                
                html += `
                    <div class="custom-dropdown-option${isSelected ? ' selected' : ''}${value === '' ? ' placeholder' : ''}" 
                         data-value="${value}">
                        ${icon ? `<i class="${icon}"></i>` : ''}
                        <span>${label}</span>
                    </div>
                `;
            });
        }
        
        return html;
    }

    getDisplayText() {
        if (this.originalSelect) {
            const selected = this.originalSelect.querySelector(`option[value="${this.selectedValue}"]`);
            if (selected) {
                const icon = selected.dataset.icon || '';
                return `${icon ? `<i class="${icon}"></i>` : ''}<span>${selected.textContent}</span>`;
            }
            return this.originalSelect.querySelector('option').textContent;
        }
        
        const option = this.options.options?.find(o => {
            const val = typeof o === 'object' ? o.value : o;
            return val === this.selectedValue;
        });
        
        if (option) {
            const label = typeof option === 'object' ? option.label : option;
            const icon = typeof option === 'object' ? option.icon : '';
            return `${icon ? `<i class="${icon}"></i>` : ''}<span>${label}</span>`;
        }
        
        return this.options.placeholder || 'Select option...';
    }

    attachEvents() {
        // Toggle dropdown
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Select option
        this.menu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectOption(opt.dataset.value);
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target) && this.isOpen) {
                this.close();
            }
        });

        // Keyboard support
        this.trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.trigger.classList.add('open');
        this.menu.classList.add('open');
        this.arrow.classList.add('rotated');
        
        // Close other dropdowns
        document.querySelectorAll('.custom-dropdown-trigger.open').forEach(t => {
            if (t !== this.trigger) {
                t.click();
            }
        });
    }

    close() {
        this.isOpen = false;
        this.trigger.classList.remove('open');
        this.menu.classList.remove('open');
        this.arrow.classList.remove('rotated');
    }

    selectOption(value) {
        this.selectedValue = value;
        
        // Update original select if exists
        if (this.originalSelect) {
            this.originalSelect.value = value;
            this.originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Update display
        this.display.innerHTML = this.getDisplayText();
        this.display.classList.toggle('placeholder', !value);
        
        // Update selected state
        this.menu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === value);
        });
        
        this.close();
        
        // Call onChange callback
        if (this.options.onChange) {
            this.options.onChange(value);
        }
    }

    getValue() {
        return this.selectedValue;
    }

    setValue(value) {
        this.selectOption(value);
    }

    refresh() {
        // Rebuild options
        const list = this.menu.querySelector('.custom-dropdown-list');
        list.innerHTML = this.buildOptions();
        
        // Reattach option click events
        this.menu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectOption(opt.dataset.value);
            });
        });
        
        // Update display
        this.display.innerHTML = this.getDisplayText();
    }

    destroy() {
        this.wrapper.remove();
        if (this.originalSelect) {
            this.originalSelect.style.display = '';
        }
    }
}

// ── Custom Date Picker ────────────────────────────────────────
class CustomDatePicker {
    constructor(element, options = {}) {
        this.element = element;
        this.options = options;
        this.selectedDate = options.defaultValue ? new Date(options.defaultValue) : null;
        this.currentMonth = new Date();
        this.isOpen = false;
        
        this.init();
    }

    init() {
        // Hide original input
        const originalInput = this.element.querySelector('input[type="date"]');
        if (originalInput) {
            originalInput.style.display = 'none';
            this.originalInput = originalInput;
            if (originalInput.value) {
                this.selectedDate = new Date(originalInput.value);
            }
        }

        // Build custom date picker
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-date-picker';
        
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-date-trigger';
        trigger.innerHTML = `
            <i class="fas fa-calendar-alt"></i>
            <span class="date-display${!this.selectedDate ? ' placeholder' : ''}">
                ${this.getDisplayText()}
            </span>
        `;
        
        const panel = document.createElement('div');
        panel.className = 'custom-date-panel';
        panel.innerHTML = this.buildCalendar();
        
        wrapper.appendChild(trigger);
        wrapper.appendChild(panel);
        
        // Insert after original input or replace element
        if (this.originalInput) {
            this.originalInput.parentNode.insertBefore(wrapper, this.originalInput.nextSibling);
        } else {
            this.element.appendChild(wrapper);
        }
        
        this.wrapper = wrapper;
        this.trigger = trigger;
        this.panel = panel;
        this.display = trigger.querySelector('.date-display');
        
        this.attachEvents();
    }

    getDisplayText() {
        if (this.selectedDate) {
            return this.selectedDate.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
        return this.options.placeholder || 'dd/mm/yyyy';
    }

    buildCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);
        
        const firstDayWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const daysInMonth = lastDay.getDate();
        const daysInPrevMonth = prevLastDay.getDate();
        
        let daysHTML = '';
        
        // Previous month days
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            daysHTML += `<button type="button" class="date-day other-month" data-date="${year}-${month}-${daysInPrevMonth - i}">${daysInPrevMonth - i}</button>`;
        }
        
        // Current month days
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = isCurrentMonth && day === today.getDate();
            const isSelected = this.selectedDate && 
                this.selectedDate.getFullYear() === year &&
                this.selectedDate.getMonth() === month &&
                this.selectedDate.getDate() === day;
            
            daysHTML += `<button type="button" class="date-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" data-date="${dateStr}">${day}</button>`;
        }
        
        // Next month days
        const totalCells = firstDayWeek + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remainingCells; i++) {
            daysHTML += `<button type="button" class="date-day other-month" data-date="${year}-${month + 2}-${i}">${i}</button>`;
        }
        
        const monthYear = this.currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        
        return `
            <div class="date-header">
                <button type="button" class="date-nav-btn" data-action="prev">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <div class="date-month-year">${monthYear}</div>
                <button type="button" class="date-nav-btn" data-action="next">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="date-weekdays">
                <div class="date-weekday">Mo</div>
                <div class="date-weekday">Tu</div>
                <div class="date-weekday">We</div>
                <div class="date-weekday">Th</div>
                <div class="date-weekday">Fr</div>
                <div class="date-weekday">Sa</div>
                <div class="date-weekday">Su</div>
            </div>
            <div class="date-days">
                ${daysHTML}
            </div>
            <div class="date-actions">
                <button type="button" class="date-clear-btn">Clear</button>
                <button type="button" class="date-today-btn">Today</button>
            </div>
        `;
    }

    attachEvents() {
        // Toggle panel
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Navigation
        this.panel.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target.closest('button');
            if (!target) return;
            
            if (target.classList.contains('date-nav-btn')) {
                const action = target.dataset.action;
                if (action === 'prev') {
                    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1);
                } else if (action === 'next') {
                    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1);
                }
                this.panel.innerHTML = this.buildCalendar();
            } else if (target.classList.contains('date-day') && !target.classList.contains('other-month')) {
                this.selectDate(target.dataset.date);
            } else if (target.classList.contains('date-today-btn')) {
                this.selectDate(new Date().toISOString().split('T')[0]);
            } else if (target.classList.contains('date-clear-btn')) {
                this.clear();
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target) && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        this.trigger.classList.add('open');
        this.panel.classList.add('open');
        
        // Close other date pickers
        document.querySelectorAll('.custom-date-trigger.open').forEach(t => {
            if (t !== this.trigger) {
                t.click();
            }
        });
    }

    close() {
        this.isOpen = false;
        this.trigger.classList.remove('open');
        this.panel.classList.remove('open');
    }

    selectDate(dateStr) {
        this.selectedDate = new Date(dateStr);
        
        // Update original input
        if (this.originalInput) {
            this.originalInput.value = dateStr;
            this.originalInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Update display
        this.display.textContent = this.getDisplayText();
        this.display.classList.remove('placeholder');
        
        // Rebuild calendar to update selected state
        this.panel.innerHTML = this.buildCalendar();
        
        this.close();
        
        // Call onChange callback
        if (this.options.onChange) {
            this.options.onChange(dateStr);
        }
    }

    clear() {
        this.selectedDate = null;
        
        if (this.originalInput) {
            this.originalInput.value = '';
            this.originalInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        this.display.textContent = this.getDisplayText();
        this.display.classList.add('placeholder');
        
        this.currentMonth = new Date();
        this.panel.innerHTML = this.buildCalendar();
        
        this.close();
        
        if (this.options.onChange) {
            this.options.onChange('');
        }
    }

    getValue() {
        return this.selectedDate ? this.selectedDate.toISOString().split('T')[0] : '';
    }

    setValue(dateStr) {
        if (dateStr) {
            this.selectDate(dateStr);
        } else {
            this.clear();
        }
    }

    destroy() {
        this.wrapper.remove();
        if (this.originalInput) {
            this.originalInput.style.display = '';
        }
    }
}

// ── Auto-init helper ──────────────────────────────────────────
window.initCustomDropdowns = function() {
    document.querySelectorAll('select:not([data-custom-dropdown-init])').forEach(select => {
        // Skip if already initialized or if parent has custom dropdown
        if (select.closest('.custom-dropdown')) return;
        
        select.setAttribute('data-custom-dropdown-init', 'true');
        const wrapper = document.createElement('div');
        wrapper.style.display = 'contents';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        new CustomDropdown(wrapper);
    });
};

window.initCustomDatePickers = function() {
    document.querySelectorAll('input[type="date"]:not([data-custom-date-init])').forEach(input => {
        if (input.closest('.custom-date-picker')) return;
        
        input.setAttribute('data-custom-date-init', 'true');
        const wrapper = document.createElement('div');
        wrapper.style.display = 'contents';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        new CustomDatePicker(wrapper);
    });
};

// Export classes
window.CustomDropdown = CustomDropdown;
window.CustomDatePicker = CustomDatePicker;
