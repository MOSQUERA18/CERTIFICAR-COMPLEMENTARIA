"""
╔══════════════════════════════════════════════════════════╗
║   CERTIFICAR COMPLEMENTARIA — Interfaz Visual Tkinter    ║
║   Desarrollado con Python + Tkinter                      ║
║   Estilo: Verde SENA + Blanco moderno                    ║
╚══════════════════════════════════════════════════════════╝
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import subprocess
import threading
import os
import sys
import queue
from datetime import datetime
from pathlib import Path

# Ruta base: junto al .exe cuando está congelado, o junto a app.py en desarrollo
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).parent
else:
    BASE_DIR = Path(__file__).parent

# ─────────────────────────────────────────────────────────
#  PALETA DE COLORES
# ─────────────────────────────────────────────────────────
C = {
    "bg_dark":    "#0a1f0a",
    "bg_card":    "#0d2b0d",
    "bg_input":   "#0f3310",
    "green_1":    "#00c853",
    "green_2":    "#69f0ae",
    "green_3":    "#1b5e20",
    "white":      "#f0fff4",
    "gray":       "#b2dfdb",
    "gray_dark":  "#4a6e4a",
    "red":        "#ef5350",
    "red_dark":   "#b71c1c",
    "yellow":     "#ffee58",
    "border":     "#1a4a1a",
    "log_bg":     "#050f05",
    "log_ok":     "#69f0ae",
    "log_warn":   "#ffee58",
    "log_err":    "#ef5350",
    "log_info":   "#80cbc4",
    "log_special":"#00e5ff",
    "log_gray":   "#4a6e4a",
    "log_title":  "#69f0ae",
}

FONT_TITLE   = ("Segoe UI", 18, "bold")
FONT_SUBTITLE= ("Segoe UI", 10)
FONT_LABEL   = ("Segoe UI", 9, "bold")
FONT_INPUT   = ("Segoe UI", 10)
FONT_BTN     = ("Segoe UI", 10, "bold")
FONT_LOG     = ("Consolas", 9)
FONT_STAT_N  = ("Segoe UI", 22, "bold")
FONT_STAT_L  = ("Segoe UI", 8)


# ═══════════════════════════════════════════════════════════
class CertificarApp(tk.Tk):

    def __init__(self):
        super().__init__()
        self.title("Certificar Complementaria — SENA")
        self.geometry("1050x720")
        self.minsize(950, 650)
        self.configure(bg=C["bg_dark"])
        self.resizable(True, True)

        # ── Estado
        self.excel_path   = tk.StringVar()
        self.usuario_var  = tk.StringVar()
        self.password_var = tk.StringVar()
        self.save_env     = tk.BooleanVar(value=True)
        self.proceso      = None
        self.corriendo    = False
        self.q            = queue.Queue()
        self.fichas_total = 0
        self.fichas_ok    = 0
        self.fichas_err   = 0
        self._logo_idx    = 0

        self._cargar_env()
        self._build_ui()
        self._animar_logo()
        self.after(100, self._leer_cola)

    # ─────────────────────────────────────────────────────
    def _cargar_env(self):
        env_path = BASE_DIR / ".env"
        if env_path.exists():
            for linea in open(env_path, "r", encoding="utf-8"):
                linea = linea.strip()
                if "=" in linea and not linea.startswith("#"):
                    k, _, v = linea.partition("=")
                    if k.strip() == "USUARIO":
                        self.usuario_var.set(v.strip())
                    elif k.strip() == "PASSWORD":
                        self.password_var.set(v.strip())

    def _guardar_env(self, usuario, password):
        env_path = BASE_DIR / ".env"
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(f"USUARIO={usuario}\n")
            f.write(f"PASSWORD={password}\n")

    # ─────────────────────────────────────────────────────
    #  LAYOUT RAÍZ
    # ─────────────────────────────────────────────────────
    def _build_ui(self):
        # Columna 0 = sidebar fijo, columna 1 = contenido expandible
        self.columnconfigure(0, weight=0, minsize=230)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(0, weight=1)

        self._build_sidebar()
        self._build_main()

    # ─────────────────────────────────────────────────────
    #  SIDEBAR
    # ─────────────────────────────────────────────────────
    def _build_sidebar(self):
        sb = tk.Frame(self, bg=C["bg_card"], width=230)
        sb.grid(row=0, column=0, sticky="nsew")
        sb.grid_propagate(False)
        sb.columnconfigure(0, weight=1)

        # Logo
        tk.Label(sb, text="", bg=C["bg_card"]).grid(row=0, column=0, pady=(20, 5))
        self.logo_canvas = tk.Canvas(sb, width=70, height=70,
                                     bg=C["bg_card"], highlightthickness=0)
        self.logo_canvas.grid(row=1, column=0)
        self._dibujar_logo(C["green_1"])

        tk.Label(sb, text="CERTIFICAR", bg=C["bg_card"], fg=C["green_1"],
                 font=("Segoe UI", 13, "bold")).grid(row=2, column=0, pady=(8, 0))
        tk.Label(sb, text="Complementaria", bg=C["bg_card"], fg=C["gray"],
                 font=("Segoe UI", 9)).grid(row=3, column=0)

        # Separador
        tk.Frame(sb, bg=C["border"], height=1).grid(row=4, column=0, sticky="ew",
                                                     padx=15, pady=15)

        # Estadísticas
        tk.Label(sb, text="ESTADÍSTICAS", bg=C["bg_card"], fg=C["gray_dark"],
                 font=("Segoe UI", 8, "bold")).grid(row=5, column=0, sticky="w", padx=15)

        self.lbl_total = self._stat_card(sb, row=6,  label="FICHAS CARGADAS", valor="0", color=C["green_2"])
        self.lbl_ok    = self._stat_card(sb, row=7,  label="CERTIFICADAS",    valor="0", color=C["green_1"])
        self.lbl_err   = self._stat_card(sb, row=8,  label="CON ERROR",       valor="0", color=C["red"])

        # Separador
        tk.Frame(sb, bg=C["border"], height=1).grid(row=9, column=0, sticky="ew",
                                                     padx=15, pady=10)

        # Versión
        tk.Label(sb, text="v2.0  |  SENA 2026", bg=C["bg_card"], fg=C["gray_dark"],
                 font=("Segoe UI", 8)).grid(row=10, column=0, pady=(0, 15))

    def _stat_card(self, parent, row, label, valor, color):
        wrapper = tk.Frame(parent, bg=C["border"], pady=1)
        wrapper.grid(row=row, column=0, sticky="ew", padx=15, pady=4)
        inner = tk.Frame(wrapper, bg=C["bg_input"], padx=12, pady=10)
        inner.pack(fill="x")
        lbl_n = tk.Label(inner, text=valor, bg=C["bg_input"], fg=color, font=FONT_STAT_N)
        lbl_n.pack(anchor="w")
        tk.Label(inner, text=label, bg=C["bg_input"], fg=C["gray_dark"],
                 font=FONT_STAT_L).pack(anchor="w")
        return lbl_n

    # ─────────────────────────────────────────────────────
    #  ÁREA PRINCIPAL  (todo usa pack para evitar conflictos)
    # ─────────────────────────────────────────────────────
    def _build_main(self):
        main = tk.Frame(self, bg=C["bg_dark"])
        main.grid(row=0, column=1, sticky="nsew")
        main.columnconfigure(0, weight=1)
        main.rowconfigure(0, weight=0)   # header
        main.rowconfigure(1, weight=0)   # formulario
        main.rowconfigure(2, weight=1)   # consola expande

        # ── Header ──────────────────────────────────────
        header = tk.Frame(main, bg=C["bg_card"], pady=14)
        header.grid(row=0, column=0, sticky="ew")
        tk.Label(header,
                 text="  Automatizacion de Certificacion SENA",
                 bg=C["bg_card"], fg=C["white"], font=FONT_TITLE,
                 anchor="w").pack(fill="x", padx=10)
        tk.Label(header,
                 text="  Configure sus credenciales, cargue el Excel con fichas y ejecute el proceso automatico.",
                 bg=C["bg_card"], fg=C["gray"], font=FONT_SUBTITLE,
                 anchor="w").pack(fill="x", padx=10)

        # ── Formulario ───────────────────────────────────
        form = tk.Frame(main, bg=C["bg_dark"])
        form.grid(row=1, column=0, sticky="ew", padx=16, pady=10)
        form.columnconfigure(0, weight=1)
        form.columnconfigure(1, weight=1)

        # Card: Excel
        excel_outer = tk.Frame(form, bg=C["border"], pady=1, padx=1)
        excel_outer.grid(row=0, column=0, sticky="nsew", padx=(0, 8), pady=(0, 8))
        excel_card = tk.Frame(excel_outer, bg=C["bg_card"])
        excel_card.pack(fill="both", expand=True)

        tk.Label(excel_card, text="  Archivo Excel de Fichas",
                 bg=C["bg_card"], fg=C["green_2"],
                 font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=4, pady=(10, 4))

        excel_row = tk.Frame(excel_card, bg=C["bg_card"])
        excel_row.pack(fill="x", padx=10, pady=(0, 4))

        self.entry_excel = tk.Entry(
            excel_row, textvariable=self.excel_path,
            bg=C["bg_input"], fg=C["white"],
            insertbackground=C["green_1"],
            relief="flat", font=FONT_INPUT,
            highlightthickness=1,
            highlightcolor=C["green_1"],
            highlightbackground=C["border"],
            state="readonly"
        )
        self.entry_excel.pack(side="left", fill="x", expand=True, ipady=6)

        btn_examinar = tk.Button(
            excel_row,
            text="  Examinar...",
            command=self._seleccionar_excel,
            bg=C["green_1"], fg=C["bg_dark"],
            activebackground=C["green_2"],
            activeforeground=C["bg_dark"],
            font=("Segoe UI", 9, "bold"),
            relief="flat", cursor="hand2",
            padx=10, pady=6, bd=0
        )
        btn_examinar.pack(side="left", padx=(8, 0))
        btn_examinar.bind("<Enter>", lambda e: btn_examinar.config(bg=C["green_2"]))
        btn_examinar.bind("<Leave>", lambda e: btn_examinar.config(bg=C["green_1"]))

        self.lbl_fichas_info = tk.Label(
            excel_card,
            text="  Sin archivo cargado",
            bg=C["bg_card"], fg=C["yellow"],
            font=("Segoe UI", 8), anchor="w"
        )
        self.lbl_fichas_info.pack(fill="x", padx=10, pady=(0, 8))

        # Card: Credenciales
        cred_outer = tk.Frame(form, bg=C["border"], pady=1, padx=1)
        cred_outer.grid(row=0, column=1, sticky="nsew", padx=(8, 0), pady=(0, 8))
        cred_card = tk.Frame(cred_outer, bg=C["bg_card"])
        cred_card.pack(fill="both", expand=True)

        tk.Label(cred_card, text="  Credenciales Sofia Plus",
                 bg=C["bg_card"], fg=C["green_2"],
                 font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=4, pady=(10, 4))

        cred_row = tk.Frame(cred_card, bg=C["bg_card"])
        cred_row.pack(fill="x", padx=10, pady=(0, 4))
        cred_row.columnconfigure(0, weight=1)
        cred_row.columnconfigure(1, weight=1)

        # Campo usuario
        user_f = tk.Frame(cred_row, bg=C["bg_card"])
        user_f.grid(row=0, column=0, sticky="ew", padx=(0, 5))
        tk.Label(user_f, text="Usuario", bg=C["bg_card"], fg=C["gray"],
                 font=FONT_LABEL, anchor="w").pack(fill="x")
        tk.Entry(user_f, textvariable=self.usuario_var,
                 bg=C["bg_input"], fg=C["white"],
                 insertbackground=C["green_1"],
                 relief="flat", font=FONT_INPUT,
                 highlightthickness=1,
                 highlightcolor=C["green_1"],
                 highlightbackground=C["border"]
                 ).pack(fill="x", ipady=6)

        # Campo contraseña
        pass_f = tk.Frame(cred_row, bg=C["bg_card"])
        pass_f.grid(row=0, column=1, sticky="ew", padx=(5, 0))
        tk.Label(pass_f, text="Contrasena", bg=C["bg_card"], fg=C["gray"],
                 font=FONT_LABEL, anchor="w").pack(fill="x")
        tk.Entry(pass_f, textvariable=self.password_var, show="*",
                 bg=C["bg_input"], fg=C["white"],
                 insertbackground=C["green_1"],
                 relief="flat", font=FONT_INPUT,
                 highlightthickness=1,
                 highlightcolor=C["green_1"],
                 highlightbackground=C["border"]
                 ).pack(fill="x", ipady=6)

        # Checkbox guardar
        tk.Checkbutton(
            cred_card,
            text=" Recordar credenciales en .env",
            variable=self.save_env,
            bg=C["bg_card"], fg=C["gray"],
            selectcolor=C["bg_input"],
            activebackground=C["bg_card"],
            activeforeground=C["green_2"],
            font=("Segoe UI", 8),
            cursor="hand2"
        ).pack(anchor="w", padx=10, pady=(2, 8))

        # ── Fila de botones ──────────────────────────────
        btn_row = tk.Frame(form, bg=C["bg_dark"])
        btn_row.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(0, 4))

        self.btn_iniciar = tk.Button(
            btn_row,
            text="  ▶  INICIAR PROCESO",
            command=self._iniciar,
            bg=C["green_1"], fg=C["bg_dark"],
            activebackground=C["green_2"],
            activeforeground=C["bg_dark"],
            font=("Segoe UI", 11, "bold"),
            relief="flat", cursor="hand2",
            padx=18, pady=8, bd=0
        )
        self.btn_iniciar.pack(side="left", padx=(0, 8))
        self.btn_iniciar.bind("<Enter>", lambda e: self.btn_iniciar.config(bg=C["green_2"]))
        self.btn_iniciar.bind("<Leave>", lambda e: self.btn_iniciar.config(bg=C["green_1"]))

        self.btn_detener = tk.Button(
            btn_row,
            text="  ■  DETENER",
            command=self._detener,
            bg=C["red_dark"], fg=C["white"],
            activebackground=C["red"],
            activeforeground=C["white"],
            font=("Segoe UI", 11, "bold"),
            relief="flat", cursor="hand2",
            padx=14, pady=8, bd=0,
            state="disabled"
        )
        self.btn_detener.pack(side="left", padx=(0, 8))
        self.btn_detener.bind("<Enter>", lambda e: self.btn_detener.config(bg=C["red"]) if self.corriendo else None)
        self.btn_detener.bind("<Leave>", lambda e: self.btn_detener.config(bg=C["red_dark"]) if self.corriendo else None)

        tk.Button(
            btn_row,
            text="  Limpiar consola",
            command=self._limpiar_log,
            bg=C["bg_input"], fg=C["green_2"],
            activebackground=C["bg_card"],
            activeforeground=C["green_2"],
            font=("Segoe UI", 10, "bold"),
            relief="flat", cursor="hand2",
            padx=12, pady=8, bd=0
        ).pack(side="left")

        self.lbl_estado = tk.Label(
            btn_row, text="  Listo",
            bg=C["bg_dark"], fg=C["gray_dark"],
            font=("Segoe UI", 9, "bold")
        )
        self.lbl_estado.pack(side="left", padx=(16, 0))

        # ── Consola ──────────────────────────────────────
        log_outer = tk.Frame(main, bg=C["bg_dark"])
        log_outer.grid(row=2, column=0, sticky="nsew", padx=16, pady=(0, 14))
        log_outer.columnconfigure(0, weight=1)
        log_outer.rowconfigure(1, weight=1)

        # Encabezado consola
        log_header = tk.Frame(log_outer, bg=C["bg_card"], pady=7)
        log_header.grid(row=0, column=0, sticky="ew")
        log_header.columnconfigure(1, weight=1)

        tk.Label(log_header, text="  Consola de Ejecucion",
                 bg=C["bg_card"], fg=C["green_2"],
                 font=("Segoe UI", 10, "bold")).grid(row=0, column=0, sticky="w", padx=8)

        self.progress_var = tk.DoubleVar(value=0)
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Green.Horizontal.TProgressbar",
                         troughcolor=C["bg_input"],
                         background=C["green_1"],
                         lightcolor=C["green_2"],
                         darkcolor=C["green_3"],
                         bordercolor=C["border"],
                         thickness=12)

        ttk.Progressbar(
            log_header,
            variable=self.progress_var,
            maximum=100, mode="determinate",
            style="Green.Horizontal.TProgressbar"
        ).grid(row=0, column=1, sticky="ew", padx=(10, 6))

        self.lbl_progress = tk.Label(
            log_header, text="0%",
            bg=C["bg_card"], fg=C["green_1"],
            font=("Segoe UI", 9, "bold"), width=5
        )
        self.lbl_progress.grid(row=0, column=2, padx=(0, 8))

        # Área de texto
        txt_border = tk.Frame(log_outer, bg=C["border"], pady=1, padx=1)
        txt_border.grid(row=1, column=0, sticky="nsew")
        txt_border.columnconfigure(0, weight=1)
        txt_border.rowconfigure(0, weight=1)

        self.log_text = tk.Text(
            txt_border,
            bg=C["log_bg"], fg=C["log_info"],
            font=FONT_LOG, wrap="word",
            state="disabled", relief="flat",
            padx=10, pady=8,
            insertbackground=C["green_1"],
            selectbackground=C["green_3"]
        )
        self.log_text.grid(row=0, column=0, sticky="nsew")

        sb_log = tk.Scrollbar(txt_border, command=self.log_text.yview,
                               bg=C["bg_card"], troughcolor=C["bg_input"])
        sb_log.grid(row=0, column=1, sticky="ns")
        self.log_text.config(yscrollcommand=sb_log.set)

        self.log_text.tag_config("ok",      foreground=C["log_ok"])
        self.log_text.tag_config("err",     foreground=C["log_err"])
        self.log_text.tag_config("warn",    foreground=C["log_warn"])
        self.log_text.tag_config("info",    foreground=C["log_info"])
        self.log_text.tag_config("special", foreground=C["log_special"])
        self.log_text.tag_config("gray",    foreground=C["log_gray"])
        self.log_text.tag_config("title",   foreground=C["log_title"],
                                  font=("Consolas", 9, "bold"))

        self._log_inicio()

    # ─────────────────────────────────────────────────────
    #  LOGO ANIMADO
    # ─────────────────────────────────────────────────────
    def _dibujar_logo(self, color):
        c = self.logo_canvas
        c.delete("all")
        c.create_oval(4, 4, 66, 66, outline=color, width=3, fill=C["bg_card"])
        c.create_polygon(24, 19, 24, 51, 56, 35, fill=color, outline="")

    def _animar_logo(self):
        colores = [C["green_1"], C["green_2"], C["green_1"], C["green_3"], C["green_1"]]
        self._dibujar_logo(colores[self._logo_idx % len(colores)])
        self._logo_idx += 1
        self.after(800, self._animar_logo)

    # ─────────────────────────────────────────────────────
    #  LOG
    # ─────────────────────────────────────────────────────
    def _log(self, texto, tag="info"):
        ts = datetime.now().strftime("%H:%M:%S")
        self.log_text.config(state="normal")
        self.log_text.insert("end", f"[{ts}] ", "gray")
        self.log_text.insert("end", texto + "\n", tag)
        self.log_text.see("end")
        self.log_text.config(state="disabled")

    def _log_inicio(self):
        self._log("====================================================", "title")
        self._log("   SENA  |  Certificar Formacion Complementaria     ", "title")
        self._log("   Sistema de Automatizacion  v2.0                  ", "title")
        self._log("====================================================", "title")
        self._log("Listo. Cargue el Excel con las fichas e inicie el proceso.", "info")

    def _limpiar_log(self):
        self.log_text.config(state="normal")
        self.log_text.delete("1.0", "end")
        self.log_text.config(state="disabled")
        self._log_inicio()

    # ─────────────────────────────────────────────────────
    #  SELECCIONAR EXCEL
    # ─────────────────────────────────────────────────────
    def _seleccionar_excel(self):
        ruta = filedialog.askopenfilename(
            title="Seleccionar archivo Excel con Fichas",
            filetypes=[
                ("Archivos Excel", "*.xlsx *.xls *.xlsm"),
                ("Todos los archivos", "*.*")
            ],
            initialdir=str(Path.home() / "Downloads")
        )
        if ruta:
            self.excel_path.set(ruta)
            self._log(f"Excel seleccionado: {ruta}", "ok")
            self._contar_fichas(ruta)

    def _contar_fichas(self, ruta):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(ruta, read_only=True)
            ws = wb.active
            fichas = []
            header = True
            for row in ws.iter_rows(values_only=True):
                if header:
                    header = False
                    continue
                if row and row[0] is not None and str(row[0]).strip():
                    fichas.append(row[0])
            wb.close()
            n = len(fichas)
            self.fichas_total = n
            self.lbl_total.config(text=str(n))
            self.lbl_fichas_info.config(
                text=f"  {n} ficha(s) detectadas — listo para procesar",
                fg=C["green_2"]
            )
            self._log(f"  {n} ficha(s) detectadas en el Excel.", "ok")
        except ImportError:
            self.lbl_fichas_info.config(
                text="  Archivo cargado (instale openpyxl para previsualizar)",
                fg=C["yellow"])
            self._log("openpyxl no instalado. El proceso igual funcionara.", "warn")
        except Exception as ex:
            self.lbl_fichas_info.config(text=f"  Error: {ex}", fg=C["red"])
            self._log(f"Error leyendo Excel: {ex}", "err")

    # ─────────────────────────────────────────────────────
    #  INICIAR
    # ─────────────────────────────────────────────────────
    def _iniciar(self):
        excel    = self.excel_path.get().strip()
        usuario  = self.usuario_var.get().strip()
        password = self.password_var.get().strip()

        if not excel or not os.path.exists(excel):
            messagebox.showerror("Sin Excel",
                "Por favor use el boton 'Examinar...' para seleccionar un archivo Excel.")
            return
        if not usuario:
            messagebox.showerror("Sin usuario", "Ingrese el usuario de Sofia Plus.")
            return
        if not password:
            messagebox.showerror("Sin contrasena", "Ingrese la contrasena de Sofia Plus.")
            return

        if self.save_env.get():
            self._guardar_env(usuario, password)
            self._log("Credenciales guardadas en .env", "gray")

        self.fichas_ok = 0
        self.fichas_err = 0
        self.lbl_ok.config(text="0")
        self.lbl_err.config(text="0")
        self.progress_var.set(0)
        self.lbl_progress.config(text="0%")

        self.corriendo = True
        self.btn_iniciar.config(state="disabled")
        self.btn_detener.config(state="normal")
        self.lbl_estado.config(text="  Ejecutando...", fg=C["green_1"])

        self._log("", "gray")
        self._log("====================================================", "title")
        self._log("   INICIANDO PROCESO DE CERTIFICACION               ", "special")
        self._log("====================================================", "title")
        self._log(f"  Excel   : {excel}", "info")
        self._log(f"  Usuario : {usuario}", "info")
        self._log(f"  Fichas  : {self.fichas_total}", "info")

        threading.Thread(
            target=self._ejecutar_proceso,
            args=(excel, usuario, password),
            daemon=True
        ).start()

    def _ejecutar_proceso(self, excel, usuario, password):
        script_dir  = BASE_DIR
        node_script = BASE_DIR / "index_v2.js"

        if not node_script.exists():
            self.q.put(("err", "No se encontro index_v2.js en el directorio del proyecto."))
            self.q.put(("fin", None))
            return

        cmd = ["node", str(node_script),
               "--excel",   excel,
               "--usuario", usuario,
               "--password",password]

        try:
            self.proceso = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace",
                cwd=str(script_dir), bufsize=1
            )
            for linea in iter(self.proceso.stdout.readline, ""):
                if not self.corriendo:
                    break
                linea = linea.rstrip()
                if linea:
                    self.q.put(("linea", linea))
            self.proceso.wait()
            code = self.proceso.returncode
            if code == 0:
                self.q.put(("ok", "Proceso finalizado correctamente."))
            else:
                self.q.put(("err", f"Proceso finalizado con codigo {code}."))
        except FileNotFoundError:
            self.q.put(("err", "No se encontro 'node'. Instale Node.js."))
        except Exception as ex:
            self.q.put(("err", f"Error inesperado: {ex}"))
        finally:
            self.q.put(("fin", None))

    # ─────────────────────────────────────────────────────
    def _leer_cola(self):
        try:
            while True:
                tipo, contenido = self.q.get_nowait()
                if tipo == "linea":
                    self._procesar_linea(contenido)
                elif tipo == "ok":
                    self._log(contenido, "ok")
                elif tipo == "err":
                    self._log(contenido, "err")
                elif tipo == "fin":
                    self._proceso_terminado()
        except queue.Empty:
            pass
        finally:
            self.after(80, self._leer_cola)

    def _procesar_linea(self, linea):
        l = linea.lower()
        if "====" in linea:
            self._log(linea, "title")
        elif "error" in l or "failed" in l:
            self._log(linea, "err")
            if "no se encontro" in l:
                self.fichas_err += 1
                self.lbl_err.config(text=str(self.fichas_err))
                self._actualizar_progreso()
        elif "resultado" in l and ("guardado" in l or "certificacion" in l):
            self._log(linea, "ok")
            self.fichas_ok += 1
            self.lbl_ok.config(text=str(self.fichas_ok))
            self._actualizar_progreso()
        elif "procesando ficha" in l:
            self._log(linea, "special")
        elif "aprendiz" in l or "aprendices" in l:
            self._log(linea, "warn")
        elif "[ok]" in l or "correctamente" in l or "guardado" in l:
            self._log(linea, "ok")
        elif "[warn]" in l:
            self._log(linea, "warn")
        else:
            self._log(linea, "info")

    def _actualizar_progreso(self):
        if self.fichas_total > 0:
            pct = ((self.fichas_ok + self.fichas_err) / self.fichas_total) * 100
            self.progress_var.set(pct)
            self.lbl_progress.config(text=f"{int(pct)}%")

    def _proceso_terminado(self):
        self.corriendo = False
        self.proceso   = None
        self.btn_iniciar.config(state="normal")
        self.btn_detener.config(state="disabled")
        self.lbl_estado.config(text="  Listo", fg=C["gray_dark"])
        self.progress_var.set(100)
        self.lbl_progress.config(text="100%")
        self._log("", "gray")
        self._log("====================================================", "title")
        self._log("   PROCESO COMPLETADO                               ", "ok")
        self._log(f"   Certificadas: {self.fichas_ok}  |  Errores: {self.fichas_err}", "info")
        self._log("====================================================", "title")

    def _detener(self):
        if self.proceso and self.corriendo:
            self.corriendo = False
            try:
                self.proceso.terminate()
                self._log("Proceso detenido por el usuario.", "warn")
            except Exception as ex:
                self._log(f"Error al detener: {ex}", "err")
            self.btn_iniciar.config(state="normal")
            self.btn_detener.config(state="disabled")
            self.lbl_estado.config(text="  Detenido", fg=C["yellow"])


if __name__ == "__main__":
    app = CertificarApp()
    app.mainloop()
