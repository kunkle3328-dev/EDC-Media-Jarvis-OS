'use client';

import React, { useState } from 'react';
import {
  EdcCalendarEvent,
  EdcClientContact,
  EdcTask,
} from '@/lib/edc-os-config';
import {
  CheckSquare,
  Calendar,
  Users,
  Plus,
  Check,
  Clock,
  Trash2,
  Volume2,
  Search,
  Mail,
  Phone,
  ArrowUpRight,
} from 'lucide-react';

interface EdcOperationsHubProps {
  tasks: EdcTask[];
  calendar: EdcCalendarEvent[];
  contacts: EdcClientContact[];
  onCreateTask: (task: EdcTask) => void;
  onUpdateTask: (task: EdcTask) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateEvent: (event: EdcCalendarEvent) => void;
  onUpdateEvent: (event: EdcCalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onCreateContact: (contact: EdcClientContact) => void;
  onUpdateContact: (contact: EdcClientContact) => void;
  onTriggerVoiceCommand: (commandText: string) => void;
}

export function EdcOperationsHub({
  tasks,
  calendar,
  contacts,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onCreateContact,
  onUpdateContact,
  onTriggerVoiceCommand,
}: EdcOperationsHubProps) {
  const [subTab, setSubTab] = useState<'tasks' | 'calendar' | 'contacts'>('tasks');

  // Task state
  const [taskFilter, setTaskFilter] = useState<'All' | 'Todo' | 'In Progress' | 'Done'>('All');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<EdcTask['category']>('Revenue & Sales');
  const [newTaskPriority, setNewTaskPriority] = useState<EdcTask['priority']>('High');
  const [newTaskDue, setNewTaskDue] = useState('Today · 17:00');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Executive');

  // Calendar state
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState('Today');
  const [evtTime, setEvtTime] = useState('15:30');
  const [evtDuration, setEvtDuration] = useState('45');
  const [evtType, setEvtType] = useState<EdcCalendarEvent['type']>('Client Meeting');
  const [evtAttendees, setEvtAttendees] = useState('');
  const [evtNotes, setEvtNotes] = useState('');

  // Contact state
  const [contactSearch, setContactSearch] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [cntName, setCntName] = useState('');
  const [cntRole, setCntRole] = useState('Chief Executive Officer');
  const [cntCompany, setCntCompany] = useState('');
  const [cntEmail, setCntEmail] = useState('');
  const [cntPhone, setCntPhone] = useState('+1 (415) 555-0192');
  const [cntTier, setCntTier] = useState<EdcClientContact['tier']>('Enterprise');
  const [cntMrr, setCntMrr] = useState('4500');
  const [cntNotes, setCntNotes] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onCreateTask({
      id: `tsk-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      status: 'Todo',
      dueDate: newTaskDue.trim() || 'Today',
      assignee: newTaskAssignee.trim() || 'Executive',
    });
    setNewTaskTitle('');
  };

  const cycleTaskStatus = (task: EdcTask) => {
    const order: EdcTask['status'][] = ['Todo', 'In Progress', 'Done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    onUpdateTask({ ...task, status: next });
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle.trim()) return;
    onCreateEvent({
      id: `evt-${Date.now()}`,
      title: evtTitle.trim(),
      date: evtDate.trim() || 'Today',
      startTime: evtTime.trim() || '15:00',
      durationMins: parseInt(evtDuration, 10) || 30,
      type: evtType,
      attendees: evtAttendees
        ? evtAttendees.split(',').map((s) => s.trim())
        : ['EDC Executive'],
      status: 'Confirmed',
      notes: evtNotes.trim() || 'Executive review and decision alignment.',
    });
    setEvtTitle('');
    setEvtAttendees('');
    setEvtNotes('');
    setShowEventForm(false);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cntName.trim() || !cntCompany.trim()) return;
    onCreateContact({
      id: `cnt-${Date.now()}`,
      name: cntName.trim(),
      role: cntRole.trim() || 'Executive Sponsor',
      company: cntCompany.trim(),
      email:
        cntEmail.trim() ||
        `${cntName.trim().toLowerCase().replace(/\s+/g, '.')}@${cntCompany
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '')}.com`,
      phone: cntPhone.trim(),
      tier: cntTier,
      status: 'Hot Prospect',
      mrrValue: parseInt(cntMrr, 10) || 3500,
      lastContacted: 'Just now',
      notes:
        cntNotes.trim() ||
        'Added via J.A.R.V.I.S. CRM. Ready for autonomous voice qualification.',
    });
    setCntName('');
    setCntCompany('');
    setCntEmail('');
    setCntNotes('');
    setShowContactForm(false);
  };

  const filteredTasks = tasks.filter((t) =>
    taskFilter === 'All' ? true : t.status === taskFilter
  );

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q)
    );
  });

  const openTaskCount = tasks.filter((t) => t.status !== 'Done').length;
  const criticalTaskCount = tasks.filter(
    (t) => t.priority === 'Critical' && t.status !== 'Done'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Sub-Module Segmented Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white font-display">
            01. EDC Media Core Business Operations Hub
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Voice-controlled Task Execution, Executive Calendar & Deadlines, and Client Contact CRM.
          </p>
        </div>

        {/* Interactive Segmented Sub-Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0B1222] border border-white/10 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSubTab('tasks')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'tasks'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tasks ({openTaskCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('calendar')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'calendar'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar ({calendar.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('contacts')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'contacts'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Client Contacts ({contacts.length})</span>
          </button>
        </div>
      </div>

      {/* MODULE 1: TASK CREATION & TRACKING */}
      {subTab === 'tasks' && (
        <div className="space-y-5">
          {/* Quick Task Creation Bar */}
          <form
            onSubmit={handleAddTask}
            className="bg-[#0B1222] border border-white/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-200">
                Create Executive or Agent Task
              </span>
              <span className="font-mono tabular-nums">
                {criticalTaskCount} CRITICAL OPEN · {openTaskCount} TOTAL ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task directive (or tell Jarvis: 'Create a critical task to...')"
                className="md:col-span-5 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />

              <select
                value={newTaskCategory}
                onChange={(e) =>
                  setNewTaskCategory(e.target.value as EdcTask['category'])
                }
                className="md:col-span-2 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-xs text-slate-200"
              >
                <option value="Revenue & Sales">Revenue & Sales</option>
                <option value="Product & AI">Product & AI</option>
                <option value="Client Delivery">Client Delivery</option>
                <option value="Executive & CFO">Executive & CFO</option>
              </select>

              <select
                value={newTaskPriority}
                onChange={(e) =>
                  setNewTaskPriority(e.target.value as EdcTask['priority'])
                }
                className="md:col-span-2 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-xs text-slate-200"
              >
                <option value="Critical">Critical Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
              </select>

              <input
                type="text"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                placeholder="Due (e.g. Today · 17:00)"
                className="md:col-span-1 min-h-[44px] px-2.5 py-2 rounded-lg bg-[#060911] border border-white/15 text-xs text-slate-200 font-mono"
              />

              <button
                type="submit"
                className="md:col-span-2 min-h-[44px] px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          </form>

          {/* Status Filter & Voice Briefing Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(['All', 'Todo', 'In Progress', 'Done'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTaskFilter(st)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                    taskFilter === st
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-[#0B1222] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                onTriggerVoiceCommand(
                  'Jarvis, brief me on my critical open tasks today and tell me which one has the highest revenue impact.'
                )
              }
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#0B1222] hover:bg-white/10 border border-white/15 text-xs font-medium text-amber-300 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice Task Briefing</span>
            </button>
          </div>

          {/* Task List */}
          <div className="bg-[#0B1222] border border-white/10 rounded-xl divide-y divide-white/10">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No tasks match the selected filter. Add a task above or ask J.A.R.V.I.S. by voice.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isDone = task.status === 'Done';
                return (
                  <div
                    key={task.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <button
                        type="button"
                        onClick={() => cycleTaskStatus(task)}
                        title="Click to cycle status (Todo -> In Progress -> Done)"
                        className={`mt-0.5 min-w-[28px] min-h-[28px] rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : task.status === 'In Progress'
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : 'bg-[#060911] border-white/20 text-slate-400 hover:border-sky-400'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
                          <span
                            className={
                              task.priority === 'Critical'
                                ? 'text-red-400 font-semibold'
                                : task.priority === 'High'
                                ? 'text-amber-300'
                                : 'text-sky-300'
                            }
                          >
                            {task.priority}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300">{task.status}</span>
                          <span aria-hidden="true">·</span>
                          <span>Assignee: {task.assignee}</span>
                        </div>

                        <p
                          className={`text-sm font-medium ${
                            isDone
                              ? 'line-through text-slate-500'
                              : 'text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0">
                      <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {task.dueDate}
                      </span>

                      <button
                        type="button"
                        onClick={() => cycleTaskStatus(task)}
                        className="min-h-[36px] px-3 py-1 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-mono text-sky-300 cursor-pointer whitespace-nowrap"
                      >
                        {isDone ? 'Reopen' : 'Advance →'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label="Delete task"
                        className="min-h-[36px] min-w-[36px] rounded-lg bg-[#060911] hover:bg-red-500/15 border border-white/10 hover:border-red-400/40 text-slate-400 hover:text-red-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODULE 2: CALENDAR & SCHEDULING */}
      {subTab === 'calendar' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-mono tabular-nums text-slate-400">
              <span>EXECUTIVE AGENDA & DEADLINES</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="text-emerald-400">ZERO SCHEDULING CONFLICTS</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onTriggerVoiceCommand(
                    'Jarvis, walk me through my calendar schedule and deadlines for today and tomorrow.'
                  )
                }
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0B1222] hover:bg-white/10 border border-white/15 text-xs font-medium text-amber-300 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Speak Schedule Briefing</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEventForm((v) => !v)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Meeting / Deadline</span>
              </button>
            </div>
          </div>

          {showEventForm && (
            <form
              onSubmit={handleAddEvent}
              className="bg-[#0B1222] border border-sky-500/30 rounded-xl p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Meeting or Deadline Title"
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  className="sm:col-span-2 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="Date (Today, Tomorrow, Oct 10)"
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Time (15:30)"
                    value={evtTime}
                    onChange={(e) => setEvtTime(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Mins"
                    value={evtDuration}
                    onChange={(e) => setEvtDuration(e.target.value)}
                    className="w-20 min-h-[44px] px-2.5 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={evtType}
                  onChange={(e) =>
                    setEvtType(e.target.value as EdcCalendarEvent['type'])
                  }
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                >
                  <option value="Client Meeting">Client Meeting</option>
                  <option value="Strategy War Room">Strategy War Room</option>
                  <option value="Deadline">Critical Deadline</option>
                  <option value="Agent Audit">Agent Audit</option>
                </select>

                <input
                  type="text"
                  placeholder="Attendees (comma separated)"
                  value={evtAttendees}
                  onChange={(e) => setEvtAttendees(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Strategic objective / notes"
                    value={evtNotes}
                    onChange={(e) => setEvtNotes(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calendar.map((evt) => (
              <div
                key={evt.id}
                className="bg-[#0B1222] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                    <span>
                      <strong className="text-sky-300">
                        {evt.date} · {evt.startTime}
                      </strong>{' '}
                      ({evt.durationMins}m)
                    </span>
                    <span
                      className={
                        evt.type === 'Deadline'
                          ? 'text-red-400'
                          : evt.status === 'Confirmed'
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }
                    >
                      {evt.type} · {evt.status}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white">
                    {evt.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {evt.notes}
                  </p>

                  <div className="text-xs text-slate-400 pt-1">
                    Attendees: {evt.attendees.join(' · ')}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateEvent({
                          ...evt,
                          status:
                            evt.status === 'Scheduled'
                              ? 'Confirmed'
                              : evt.status === 'Confirmed'
                              ? 'Completed'
                              : 'Scheduled',
                        })
                      }
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-mono text-sky-300 cursor-pointer whitespace-nowrap"
                    >
                      Status: {evt.status} →
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onTriggerVoiceCommand(
                          `Jarvis, give me a 3-point executive preparation brief for "${evt.title}" at ${evt.startTime}.`
                        )
                      }
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-amber-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Prep Brief</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteEvent(evt.id)}
                    aria-label="Cancel event"
                    className="min-h-[38px] min-w-[38px] rounded-lg bg-[#060911] hover:bg-red-500/15 border border-white/10 text-slate-400 hover:text-red-300 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 3: CLIENT CONTACT MANAGEMENT (CRM) */}
      {subTab === 'contacts' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts by name, company, role, or notes..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#0B1222] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowContactForm((v) => !v)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client Contact</span>
            </button>
          </div>

          {showContactForm && (
            <form
              onSubmit={handleAddContact}
              className="bg-[#0B1222] border border-sky-500/30 rounded-xl p-4 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Contact Full Name"
                  value={cntName}
                  onChange={(e) => setCntName(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Company / Account"
                  value={cntCompany}
                  onChange={(e) => setCntCompany(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="Executive Role / Title"
                  value={cntRole}
                  onChange={(e) => setCntRole(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                />
                <select
                  value={cntTier}
                  onChange={(e) =>
                    setCntTier(e.target.value as EdcClientContact['tier'])
                  }
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                >
                  <option value="Enterprise">Enterprise Tier</option>
                  <option value="Mid-Market">Mid-Market Tier</option>
                  <option value="VIP Partner">VIP Partner</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={cntEmail}
                  onChange={(e) => setCntEmail(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={cntPhone}
                  onChange={(e) => setCntPhone(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                />
                <input
                  type="number"
                  placeholder="Est. MRR ($/mo)"
                  value={cntMrr}
                  onChange={(e) => setCntMrr(e.target.value)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white font-mono"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Account notes..."
                    value={cntNotes}
                    onChange={(e) => setCntNotes(e.target.value)}
                    className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-[#060911] border border-white/15 text-sm text-white"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-[#0B1222] border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                    <span>
                      <strong className="text-sky-300">{contact.tier}</strong> ·{' '}
                      <span
                        className={
                          contact.status === 'Active Client'
                            ? 'text-emerald-400'
                            : 'text-amber-300'
                        }
                      >
                        {contact.status}
                      </span>
                    </span>
                    <span className="text-white font-semibold">
                      ${contact.mrrValue.toLocaleString()}/mo MRR
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {contact.role} ·{' '}
                      <strong className="text-white">{contact.company}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      {contact.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      {contact.phone}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    {contact.notes}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onCreateTask({
                          id: `tsk-${Date.now()}`,
                          title: `Executive follow-up with ${contact.name} (${contact.company})`,
                          category: 'Revenue & Sales',
                          priority: 'High',
                          status: 'Todo',
                          dueDate: 'Today · 17:00',
                          assignee: 'Executive',
                          linkedClient: contact.company,
                        });
                        onUpdateContact({
                          ...contact,
                          lastContacted: 'Task queued today',
                        });
                        setSubTab('tasks');
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                      <span>Queue Task</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCreateEvent({
                          id: `evt-${Date.now()}`,
                          title: `${contact.company} — Executive Strategy Call with ${contact.name}`,
                          date: 'Tomorrow',
                          startTime: '14:00',
                          durationMins: 30,
                          type: 'Client Meeting',
                          attendees: [
                            `${contact.name} (${contact.role})`,
                            'EDC Executive',
                          ],
                          status: 'Scheduled',
                          notes: contact.notes,
                        });
                        setSubTab('calendar');
                      }}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Book Call</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onTriggerVoiceCommand(
                        `Jarvis, brief me on ${contact.name} at ${contact.company} and recommend our next closing or expansion move.`
                      )
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#060911] hover:bg-white/5 border border-white/10 text-xs font-medium text-amber-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Dossier</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
