from datetime import date, datetime, time, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(r"C:\Users\akhse\Desktop\REPO\TestLineas")
OUTPUT = ROOT / "docs" / "Cronograma_Test_de_Lineas_ProjectLibre.xml"
NS = "http://schemas.microsoft.com/project"
ET.register_namespace("", NS)


def element(parent, name, value=None):
    child = ET.SubElement(parent, f"{{{NS}}}{name}")
    if value is not None:
        child.text = str(value)
    return child


def stamp(day, at=time(8, 0)):
    return datetime.combine(day, at).isoformat(timespec="seconds")


def working_days(start, end):
    current = start
    count = 0
    while current <= end:
        count += current.weekday() < 5
        current += timedelta(days=1)
    return count


tasks = []


def add(name, start, finish, level, summary=False, milestone=False, previous=None):
    start = date.fromisoformat(start)
    finish = date.fromisoformat(finish)
    days = 0 if milestone else working_days(start, finish)
    if not milestone and not summary and days < 1:
        raise ValueError(name)
    tasks.append(dict(
        id=len(tasks), name=name, start=start, finish=finish, level=level,
        summary=summary, milestone=milestone, days=days, previous=previous,
    ))


add("Test de Líneas", "2026-08-01", "2026-10-21", 0, summary=True)
add("Inicio", "2026-08-01", "2026-08-01", 1, summary=True)
add("Inicio del proyecto", "2026-08-01", "2026-08-01", 2, milestone=True)
add("Planificación y estimación", "2026-08-03", "2026-08-07", 1, summary=True)
add("Definir alcance y Product Backlog", "2026-08-03", "2026-08-05", 2)
add("Estimar y organizar los sprints", "2026-08-06", "2026-08-07", 2, previous=4)
add("Implementación", "2026-08-10", "2026-10-16", 1, summary=True)

sprints = [
    ("Sprint 1 - Base del sistema", "2026-08-10", "2026-08-21", "2026-08-10", "2026-08-11", "2026-08-20", "2026-08-21", "Acceso profesional, pacientes y enlaces"),
    ("Sprint 2 - Aplicación de la prueba", "2026-08-24", "2026-09-04", "2026-08-24", "2026-08-25", "2026-09-03", "2026-09-04", "Consentimiento y ordenamiento de estímulos"),
    ("Sprint 3 - Resultados", "2026-09-07", "2026-09-18", "2026-09-07", "2026-09-08", "2026-09-17", "2026-09-18", "Cálculo, registro y consulta de evaluaciones"),
    ("Sprint 4 - Informes", "2026-09-21", "2026-10-02", "2026-09-21", "2026-09-22", "2026-10-01", "2026-10-02", "Historial, informes, Excel e importación PDF"),
    ("Sprint 5 - Tesis y cierre", "2026-10-05", "2026-10-16", "2026-10-05", "2026-10-06", "2026-10-15", "2026-10-16", "Registro de tiempos, panel Tesis y pruebas"),
]
previous = 5
for title, first, last, planning, implementation, implementation_end, review, work in sprints:
    add(title, first, last, 2, summary=True)
    add("Planificación del sprint", planning, planning, 3, previous=previous)
    plan_id = len(tasks) - 1
    add(work, implementation, implementation_end, 3, previous=plan_id)
    work_id = len(tasks) - 1
    add("Revisión y retrospectiva del sprint", review, review, 3, previous=work_id)
    previous = len(tasks) - 1

add("Lanzamiento", "2026-10-19", "2026-10-21", 1, summary=True)
add("Revisión final y ajustes", "2026-10-19", "2026-10-20", 2, previous=previous)
add("Lanzamiento del proyecto", "2026-10-21", "2026-10-21", 2, milestone=True, previous=len(tasks) - 1)

project = ET.Element(f"{{{NS}}}Project")
project_fields = [
    ("SaveVersion", 14),
    ("Name", "Cronograma Test de Líneas"),
    ("Title", "Cronograma Scrum del proyecto Test de Líneas"),
    ("Subject", "Planificación del proyecto Test de Líneas"),
    ("Author", "Axel Kevin Huaman Solis"),
    ("ScheduleFromStart", 1),
    ("StartDate", "2026-08-01T08:00:00"),
    ("FinishDate", "2026-10-21T17:00:00"),
    ("CalendarUID", 1),
    ("DefaultStartTime", "08:00:00"),
    ("DefaultFinishTime", "17:00:00"),
    ("MinutesPerDay", 480),
    ("MinutesPerWeek", 2400),
    ("DaysPerMonth", 20),
    ("DurationFormat", 7),
    ("WorkFormat", 2),
    ("WeekStartDay", 2),
]
for key, value in project_fields:
    element(project, key, value)

calendars = element(project, "Calendars")
calendar = element(calendars, "Calendar")
element(calendar, "UID", 1)
element(calendar, "Name", "Estándar - lunes a viernes")
element(calendar, "IsBaseCalendar", 1)
element(calendar, "BaseCalendarUID", -1)
weekdays = element(calendar, "WeekDays")
for day_type in range(1, 8):
    weekday = element(weekdays, "WeekDay")
    element(weekday, "DayType", day_type)
    is_working = day_type in (2, 3, 4, 5, 6)
    element(weekday, "DayWorking", int(is_working))
    if is_working:
        working_times = element(weekday, "WorkingTimes")
        for start_time, end_time in (("08:00:00", "12:00:00"), ("13:00:00", "17:00:00")):
            working_time = element(working_times, "WorkingTime")
            element(working_time, "FromTime", start_time)
            element(working_time, "ToTime", end_time)

task_collection = element(project, "Tasks")
outline_counters = [0, 0, 0, 0]
for item in tasks:
    task = element(task_collection, "Task")
    index = item["id"]
    level = item["level"]
    if level:
        outline_counters[level] += 1
        for deeper in range(level + 1, len(outline_counters)):
            outline_counters[deeper] = 0
    outline = ".".join(str(outline_counters[depth]) for depth in range(1, level + 1))
    fields = [
        ("UID", index),
        ("ID", index),
        ("Name", item["name"]),
        ("Type", 0),
        ("IsNull", 0),
        ("WBS", outline if level else "0"),
        ("OutlineNumber", outline if level else "0"),
        ("OutlineLevel", level),
        ("Start", stamp(item["start"])),
        ("Finish", stamp(item["finish"], time(8, 0) if item["finish"] == date(2026, 8, 1) else time(17, 0))),
        ("Duration", f"PT{item['days'] * 8}H0M0S"),
        ("DurationFormat", 7),
        ("Milestone", int(item["milestone"])),
        ("Summary", int(item["summary"])),
        ("CalendarUID", 1),
    ]
    for key, value in fields:
        element(task, key, value)
    if item["previous"] is not None:
        link = element(task, "PredecessorLink")
        element(link, "PredecessorUID", item["previous"])
        element(link, "Type", 1)

ET.indent(project, space="  ")
ET.ElementTree(project).write(OUTPUT, encoding="utf-8", xml_declaration=True)
print(OUTPUT)
print(f"Tareas: {len(tasks)}; último hito: {tasks[-1]['start']}")
