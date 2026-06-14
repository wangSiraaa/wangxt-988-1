/* global window, Store, Util */
(function (global) {

  const DOT_COLOR = {
    status: 'primary',
    change: 'warning',
    finance: 'purple',
    comm: 'info'
  };

  const SUB_DOT = {
    created: 'primary', assigned: 'primary', survey: 'info', surveying: 'info',
    priced: 'info', pending: 'warning', returned: 'danger', confirmed: 'success',
    working: 'primary', checking: 'warning', accepted: 'success', done: 'success',
    rework: 'danger', review: 'warning'
  };

  const TIMELINE = {
    render(order) {
      const items = (order.timeline || []).slice().sort((a, b) => a.time - b.time);
      if (!items.length) return '<div style="color:#909399;padding:20px">暂无时间线记录</div>';
      return `<div class="timeline">${items.map(it => TIMELINE.item(it, order)).join('')}</div>`;
    },

    item(ev, order) {
      const users = Store.users();
      const user = users[ev.userId] || { name: '系统', role: 'sys' };
      const dotCls = SUB_DOT[ev.sub] || DOT_COLOR[ev.type] || 'primary';
      const meta = (ev.meta || []).length
        ? `<div class="t-meta">${ev.meta.map(m => `<span class="chip"><b>${m.k}</b>：${m.v}</span>`).join('')}</div>`
        : '';
      const content = ev.content
        ? `<div class="t-content">${ev.content.split('\n').map(l => l.trim()).filter(Boolean).map(l => `<div>${l}</div>`).join('')}</div>`
        : '';
      const typeIcon = {
        status: '📌', change: '🔄', finance: '💰', comm: '💬'
      }[ev.type] || '•';
      return `<div class="timeline-item">
        <div class="timeline-dot ${dotCls}"></div>
        <div class="t-head">
          <span style="font-size:14px">${typeIcon}</span>
          <span class="t-title">${ev.title}</span>
          <span class="t-user">${user.name}${user.title ? ' · ' + user.title : ''}</span>
          <span class="t-time" title="${Util.fmtTime(ev.time)}">${Util.relativeTime(ev.time)}</span>
        </div>
        ${content}
        ${meta}
      </div>`;
    }
  };

  global.Timeline = TIMELINE;
})(window);
