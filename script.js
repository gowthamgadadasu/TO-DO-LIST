(function(){
  var STORAGE_KEY = 'missions';
  var listEl = document.getElementById('list');
  var inputEl = document.getElementById('composerInput');
  var addBtn = document.getElementById('addBtn');
  var metaLine = document.getElementById('metaLine');
  var selectBar = document.getElementById('selectBar');
  var selectCount = document.getElementById('selectCount');
  var selectCancelBtn = document.getElementById('selectCancelBtn');
  var bulkDoneBtn = document.getElementById('bulkDoneBtn');
  var bulkRemoveBtn = document.getElementById('bulkRemoveBtn');

  var missions = [];
  var openMenuId = null;
  var editingId = null;
  var idCounter = 1;
  var selectMode = false;
  var selectedIds = [];
  var clickTimers = {};

  function uid(){
    return 'm' + (idCounter++) + '_' + Date.now().toString(36);
  }

  function hasStorage(){
    return typeof window !== 'undefined' && !!window.storage;
  }

  async function loadMissions(){
    try{
      if(hasStorage()){
        var result = await window.storage.get(STORAGE_KEY, false);
        if(result && result.value){
          missions = JSON.parse(result.value);
        }
      } else {
        var raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
        if(raw){ missions = JSON.parse(raw); }
      }
    }catch(e){
      missions = [];
    }
    render();
  }

  async function saveMissions(){
    try{
      if(hasStorage()){
        await window.storage.set(STORAGE_KEY, JSON.stringify(missions), false);
      } else if(window.localStorage){
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
      }
    }catch(e){
      /* persistence unavailable — list still works for this session */
    }
  }

  function addMission(text){
    var trimmed = text.trim();
    if(!trimmed) return;
    missions.push({ id: uid(), text: trimmed, done: false });
    saveMissions();
    render();
  }

  function removeMission(id){
    var rowEl = listEl.querySelector('[data-id="' + id + '"]');
    if(rowEl){
      rowEl.classList.add('removing');
      setTimeout(function(){
        missions = missions.filter(function(m){ return m.id !== id; });
        saveMissions();
        render();
      }, 200);
    } else {
      missions = missions.filter(function(m){ return m.id !== id; });
      saveMissions();
      render();
    }
    closeMenu();
  }

  function toggleDone(id){
    missions = missions.map(function(m){
      if(m.id === id) return Object.assign({}, m, { done: !m.done });
      return m;
    });
    saveMissions();
    closeMenu();
    render();
  }

  function startEdit(id){
    editingId = id;
    closeMenu();
    render();
  }

  function commitEdit(id, value){
    var trimmed = value.trim();
    editingId = null;
    if(!trimmed){
      removeMission(id);
      return;
    }
    missions = missions.map(function(m){
      if(m.id === id) return Object.assign({}, m, { text: trimmed });
      return m;
    });
    saveMissions();
    render();
  }

  function openMenu(id){
    openMenuId = (openMenuId === id) ? null : id;
    render();
  }

  function closeMenu(){ openMenuId = null; }

  // --- Multi-select (WhatsApp-style): starts from a row's "Select" menu
  // option, then tap other rows' checkboxes to add them, then act on all
  // selected at once with Mark done / Remove in the bar above the list.

  function startSelecting(id){
    selectMode = true;
    selectedIds = [id];
    closeMenu();
    updateSelectBar();
    render();
  }

  function toggleSelected(id){
    var idx = selectedIds.indexOf(id);
    if(idx === -1){ selectedIds.push(id); }
    else { selectedIds.splice(idx, 1); }
    if(selectedIds.length === 0){
      exitSelectMode();
      return;
    }
    updateSelectBar();
    render();
  }

  function exitSelectMode(){
    selectMode = false;
    selectedIds = [];
    updateSelectBar();
    render();
  }

  function updateSelectBar(){
    selectBar.hidden = !selectMode;
    var n = selectedIds.length;
    selectCount.textContent = n + (n === 1 ? ' selected' : ' selected');
  }

  function bulkMarkDone(){
    if(selectedIds.length === 0) return;
    var idSet = selectedIds;
    missions = missions.map(function(m){
      if(idSet.indexOf(m.id) !== -1) return Object.assign({}, m, { done: true });
      return m;
    });
    saveMissions();
    exitSelectMode();
  }

  function bulkRemove(){
    if(selectedIds.length === 0) return;
    var idSet = selectedIds;
    idSet.forEach(function(id){
      var rowEl = listEl.querySelector('[data-id="' + id + '"]');
      if(rowEl){ rowEl.classList.add('removing'); }
    });
    setTimeout(function(){
      missions = missions.filter(function(m){ return idSet.indexOf(m.id) === -1; });
      saveMissions();
      exitSelectMode();
    }, 200);
  }

  function render(){
    listEl.innerHTML = '';

    if(missions.length === 0){
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.innerHTML = 'Nothing queued yet<span class="cursor"></span>';
      listEl.appendChild(empty);
    }

    missions.forEach(function(m){
      var isSelected = selectedIds.indexOf(m.id) !== -1;
      var li = document.createElement('li');
      li.className = 'row' + (m.done ? ' done' : '') + (isSelected ? ' selected' : '');
      li.setAttribute('data-id', m.id);

      if(selectMode){
        var checkbox = document.createElement('span');
        checkbox.className = 'checkbox';
        checkbox.innerHTML = '<svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        checkbox.addEventListener('click', function(e){
          e.stopPropagation();
          toggleSelected(m.id);
        });
        li.appendChild(checkbox);
      } else {
        var marker = document.createElement('span');
        marker.className = 'marker';
        li.appendChild(marker);
      }

      if(editingId === m.id){
        var editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = m.text;
        li.appendChild(editInput);

        setTimeout(function(){
          editInput.focus();
          editInput.setSelectionRange(editInput.value.length, editInput.value.length);
        }, 0);

        editInput.addEventListener('keydown', function(e){
          if(e.key === 'Enter'){ commitEdit(m.id, editInput.value); }
          if(e.key === 'Escape'){ editingId = null; render(); }
        });
        editInput.addEventListener('blur', function(){
          commitEdit(m.id, editInput.value);
        });
      } else {
        var textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = m.text;
        textSpan.addEventListener('click', function(e){
          e.stopPropagation();
          if(selectMode){ toggleSelected(m.id); return; }
          // Delay the single-click action briefly so a follow-up second
          // click can upgrade this into a double-click (which opens the
          // menu instead of toggling done).
          if(clickTimers[m.id]){ return; }
          clickTimers[m.id] = setTimeout(function(){
            delete clickTimers[m.id];
            toggleDone(m.id);
          }, 220);
        });
        textSpan.addEventListener('dblclick', function(e){
          e.stopPropagation();
          if(selectMode){ return; }
          if(clickTimers[m.id]){
            clearTimeout(clickTimers[m.id]);
            delete clickTimers[m.id];
          }
          openMenu(m.id);
        });
        li.appendChild(textSpan);
      }

      if(!selectMode && openMenuId === m.id){
        var menu = document.createElement('div');
        menu.className = 'menu';

        var editBtn = document.createElement('button');
        editBtn.innerHTML = '<span class="glyph">e</span> Edit text';
        editBtn.addEventListener('click', function(e){
          e.stopPropagation();
          startEdit(m.id);
        });
        menu.appendChild(editBtn);

        var selectBtn = document.createElement('button');
        selectBtn.innerHTML = '<span class="glyph">☐</span> Select';
        selectBtn.addEventListener('click', function(e){
          e.stopPropagation();
          startSelecting(m.id);
        });
        menu.appendChild(selectBtn);

        var divider = document.createElement('div');
        divider.className = 'menu-divider';
        menu.appendChild(divider);

        var removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.innerHTML = '<span class="glyph">x</span> Remove';
        removeBtn.addEventListener('click', function(e){
          e.stopPropagation();
          removeMission(m.id);
        });
        menu.appendChild(removeBtn);

        li.appendChild(menu);
      }

      listEl.appendChild(li);
    });

    var total = missions.length;
    var doneCount = missions.filter(function(m){ return m.done; }).length;
    metaLine.textContent = total + (total === 1 ? ' mission' : ' missions') + ' · ' + doneCount + ' done';
  }

  addBtn.addEventListener('click', function(){
    addMission(inputEl.value);
    inputEl.value = '';
    inputEl.focus();
  });

  inputEl.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      addMission(inputEl.value);
      inputEl.value = '';
    }
  });

  document.addEventListener('click', function(){
    if(openMenuId !== null){
      closeMenu();
      render();
    }
  });

  selectCancelBtn.addEventListener('click', function(){
    exitSelectMode();
  });

  bulkDoneBtn.addEventListener('click', function(){
    bulkMarkDone();
  });

  bulkRemoveBtn.addEventListener('click', function(){
    bulkRemove();
  });

  loadMissions();

  // Register the service worker so the app can be installed and
  // keep working offline. Purely additive — no effect on app logic.
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').catch(function(){
        /* offline/installable support unavailable — app still works online */
      });
    });
  }
})();
