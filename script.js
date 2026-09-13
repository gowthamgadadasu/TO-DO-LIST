(function(){
  var STORAGE_KEY = 'missions';
  var listEl = document.getElementById('list');
  var inputEl = document.getElementById('composerInput');
  var addBtn = document.getElementById('addBtn');
  var metaLine = document.getElementById('metaLine');

  var missions = [];
  var openMenuId = null;
  var editingId = null;
  var idCounter = 1;
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

  function render(){
    listEl.innerHTML = '';

    if(missions.length === 0){
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.innerHTML = 'Nothing queued yet<span class="cursor"></span>';
      listEl.appendChild(empty);
    }

    missions.forEach(function(m){
      var li = document.createElement('li');
      li.className = 'row' + (m.done ? ' done' : '');
      li.setAttribute('data-id', m.id);

      var marker = document.createElement('span');
      marker.className = 'marker';
      li.appendChild(marker);

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
          if(clickTimers[m.id]){
            clearTimeout(clickTimers[m.id]);
            delete clickTimers[m.id];
          }
          openMenu(m.id);
        });
        li.appendChild(textSpan);
      }

      if(openMenuId === m.id){
        var menu = document.createElement('div');
        menu.className = 'menu';

        var doneBtn = document.createElement('button');
        doneBtn.innerHTML = '<span class="glyph">✓</span> ' + (m.done ? 'Mark undone' : 'Mark done');
        doneBtn.addEventListener('click', function(e){
          e.stopPropagation();
          toggleDone(m.id);
        });
        menu.appendChild(doneBtn);

        var divider = document.createElement('div');
        divider.className = 'menu-divider';
        menu.appendChild(divider);

        var removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.innerHTML = '<span class="glyph">x</span> Delete';
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
