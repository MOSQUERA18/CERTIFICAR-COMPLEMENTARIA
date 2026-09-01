/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║   CERTIFICAR COMPLEMENTARIA  v2.0                        ║
 * ║   Bot Node.js + Playwright                               ║
 * ║   Acepta parámetros CLI: --excel --usuario --password    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { chromium } from "playwright";
import XLSX from "xlsx";
import path from "path";
import os from "os";
import fs from "fs";

// ─────────────────────────────────────────────────────────
//  PARSEAR ARGUMENTOS CLI
// ─────────────────────────────────────────────────────────
function parsearArgs() {
    const args = process.argv.slice(2);
    const resultado = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--") && args[i + 1]) {
            const clave = args[i].slice(2);
            resultado[clave] = args[i + 1];
            i++;
        }
    }

    return resultado;
}

// ─────────────────────────────────────────────────────────
//  LEER FICHAS DESDE EXCEL (ruta dinámica)
// ─────────────────────────────────────────────────────────
function leerFichas(rutaExcel) {

    if (!fs.existsSync(rutaExcel)) {
        console.error(`[ERROR] No se encontró el archivo Excel: ${rutaExcel}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(rutaExcel);
    const nombreHoja = workbook.SheetNames[0];
    const hoja = workbook.Sheets[nombreHoja];
    const datos = XLSX.utils.sheet_to_json(hoja);

    // Buscar la primera columna que tenga datos numéricos (fichas)
    // Compatible con columna llamada "Fichas", "FICHA", "ficha", etc.
    const primeraFila = datos[0];
    if (!primeraFila) {
        console.error("[ERROR] El Excel está vacío o no tiene datos.");
        process.exit(1);
    }

    // Intentar encontrar columna "Fichas" (case-insensitive)
    const columnas = Object.keys(primeraFila);
    const colFicha = columnas.find(c =>
        c.toLowerCase().includes("ficha") ||
        c.toLowerCase().includes("codigo") ||
        c.toLowerCase().includes("number")
    ) || columnas[0]; // Usar primera columna si no hay coincidencia

    console.log(`[INFO] Columna detectada: "${colFicha}"`);

    const fichas = datos
        .map(fila => fila[colFicha])
        .filter(f => f !== undefined && f !== null && String(f).trim() !== "");

    console.log(`[INFO] Total fichas: ${fichas.length}`);
    return fichas;
}

// ─────────────────────────────────────────────────────────
//  GUARDAR RESULTADO EN EXCEL
// ─────────────────────────────────────────────────────────
function guardarResultado(ficha, resultado) {

    const rutaDescargas = path.join(os.homedir(), "Downloads");
    const rutaArchivo = path.join(
        rutaDescargas,
        "resultadoscertificacioncomplementaria.xlsx"
    );

    let datos = [];

    if (fs.existsSync(rutaArchivo)) {
        const workbookExistente = XLSX.readFile(rutaArchivo);
        const nombreHoja = workbookExistente.SheetNames[0];
        const hojaExistente = workbookExistente.Sheets[nombreHoja];
        datos = XLSX.utils.sheet_to_json(hojaExistente);
    }

    datos.push({
        FICHA: ficha,
        RESULTADO: resultado,
        FECHA: new Date().toLocaleString("es-CO")
    });

    const workbook = XLSX.utils.book_new();
    const hoja = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(workbook, hoja, "Resultados");
    XLSX.writeFile(workbook, rutaArchivo);

    console.log(`[OK] Resultado guardado en: ${rutaArchivo}`);
}

// ─────────────────────────────────────────────────────────
//  FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────
async function iniciar() {

    const args = parsearArgs();

    const rutaExcel = args.excel;
    const usuario   = args.usuario;
    const password  = args.password;

    // Validar argumentos
    if (!rutaExcel || !usuario || !password) {
        console.error("[ERROR] Faltan argumentos requeridos.");
        console.error("Uso: node index_v2.js --excel <ruta> --usuario <user> --password <pass>");
        process.exit(1);
    }

    console.log("====================================");
    console.log("  CERTIFICAR COMPLEMENTARIA  v2.0  ");
    console.log("====================================");
    console.log(`[INFO] Excel: ${rutaExcel}`);
    console.log(`[INFO] Usuario: ${usuario}`);

    const fichas = leerFichas(rutaExcel);
    console.log(`[INFO] Fichas encontradas: ${fichas}`);

    // ──────────────────────────────────────────────────────
    //  ABRIR NAVEGADOR
    // ──────────────────────────────────────────────────────
    const browser = await chromium.launch({
        headless: false,
        slowMo: 500
    });

    const page = await browser.newPage();

    // ──────────────────────────────────────────────────────
    //  ABRIR SOFIA PLUS
    // ──────────────────────────────────────────────────────
    await page.goto("http://senasofiaplus.edu.co/sofia-public/");
    await page.waitForTimeout(3000);

    // ──────────────────────────────────────────────────────
    //  FORMULARIO DE INGRESO
    // ──────────────────────────────────────────────────────
    const frame = page.frameLocator("#registradoBox1");

    await frame.locator("#username").fill(usuario);
    await frame.locator('input[name="josso_password"]').fill(password);

    console.log("[OK] Usuario y contraseña colocados correctamente.");

    await frame.locator('input[name="ingresar"]').click();
    await page.waitForTimeout(5000);

    // ──────────────────────────────────────────────────────
    //  SELECCIONAR ROL
    // ──────────────────────────────────────────────────────
    await page.locator("#seleccionRol\\:roles").selectOption("18");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // ──────────────────────────────────────────────────────
    //  NAVEGACIÓN AL MÓDULO DE CERTIFICACIÓN
    // ──────────────────────────────────────────────────────
    await page.locator("span.menuPrimario", { hasText: "Certificación" }).click();
    await page.waitForTimeout(1000);

    const menuCertificacion = page.locator("li.active").filter({
        has: page.locator("span.menuPrimario", { hasText: "Certificación" })
    });

    await menuCertificacion.locator("ul.nav-second-level > li:first-child > a").click();
    await page.waitForTimeout(1000);

    // ──────────────────────────────────────────────────────
    //  CERTIFICAR FORMACIÓN COMPLEMENTARIA
    // ──────────────────────────────────────────────────────
    await page.locator('[id="92146Opcion"]').click();
    await page.waitForTimeout(2000);

    const frame1 = page.frameLocator("#contenido");

    // ──────────────────────────────────────────────────────
    //  PROCESAR TODAS LAS FICHAS
    // ──────────────────────────────────────────────────────
    for (let i = 0; i < fichas.length; i++) {

        const numeroFicha = fichas[i];

        console.log("====================================");
        console.log(`Procesando ficha ${i + 1} de ${fichas.length}`);
        console.log(`Ficha: ${numeroFicha}`);
        console.log("====================================");

        // Abrir consulta de ficha
        await frame1.locator('[id="frmContenido:cmdlnkFicha"]').click();
        await page.waitForTimeout(2000);

        // Buscar frame de la modal
        const modalFrame = page.frames().find(
            frame => frame.name() === "modalDialogContentvFichas"
        );

        if (!modalFrame) {
            console.error(`[ERROR] No se encontró el modal de búsqueda para ficha ${numeroFicha}`);
            guardarResultado(numeroFicha, "Error: modal no encontrado");
            continue;
        }

        // Input código de ficha
        const inputFicha = modalFrame.locator("#form\\:codigoFichaITX");
        await inputFicha.waitFor({ state: "attached", timeout: 10000 });
        await inputFicha.fill(String(numeroFicha));

        console.log(`[INFO] Ficha colocada en el input: ${numeroFicha}`);

        const btnBuscar = modalFrame.locator("#form\\:buscarCBT");
        await btnBuscar.click();

        // Seleccionar resultado
        const btnSeleccionar = modalFrame.locator("#form\\:dtFichas\\:0\\:cmdlnkShow");
        await btnSeleccionar.waitFor({ state: "attached", timeout: 15000 });
        await btnSeleccionar.click();

        // Consultar aprendices
        const btnConsultarAprendices = frame1.locator(
            "#frmContenido\\:cmdlnkSearchPrograma"
        );
        await btnConsultarAprendices.waitFor({ state: "visible", timeout: 10000 });
        await btnConsultarAprendices.click();

        console.log("[OK] Botón 'Consultar Aprendices' presionado.");
        await page.waitForTimeout(2000);

        // Seleccionar GENERAR DOCUMENTO para todos los aprendices
        const selectsGenerarDocumento = frame1.locator(
            'select[id*=":selOpcionAprobacion"]'
        );
        const cantidadAprendices = await selectsGenerarDocumento.count();
        console.log(`[INFO] Aprendices encontrados: ${cantidadAprendices}`);

        for (let j = 0; j < cantidadAprendices; j++) {
            const select = selectsGenerarDocumento.nth(j);
            await select.waitFor({ state: "visible", timeout: 10000 });
            await select.selectOption("GENERAR_DOCUMENTO");
            console.log(`[INFO] Aprendiz ${j + 1}: Generar Documento seleccionado`);
            await page.waitForTimeout(1000);
        }

        // Certificar aprendices
        const btnCertificarAprendices = frame1.locator(
            "#frmContenido\\:cmdlnkAprobar"
        );
        await btnCertificarAprendices.waitFor({ state: "visible", timeout: 10000 });
        await btnCertificarAprendices.click();

        console.log("[OK] Botón 'Certificar Aprendices' presionado.");

        // Buscar mensaje de resultado
        const mensajeResultado = frame1.locator('[id$=":messages"]');

        try {
            await mensajeResultado.first().waitFor({
                state: "visible",
                timeout: 15000
            });

            const resultado = (await mensajeResultado.first().innerText()).trim();

            console.log("====================================");
            console.log("RESULTADO DE LA CERTIFICACIÓN:");
            console.log(resultado);
            console.log("====================================");

            guardarResultado(numeroFicha, resultado);
            console.log(`[OK] Resultado de ficha ${numeroFicha} guardado correctamente.`);

        } catch (error) {
            console.log(`[WARN] No se encontró mensaje de resultado para la ficha ${numeroFicha}.`);
            console.log(`[ERROR] ${error.message}`);
            guardarResultado(numeroFicha, "No se encontró mensaje de resultado");
        }

        await page.waitForTimeout(1500);
    }

    // ──────────────────────────────────────────────────────
    //  FIN DEL PROCESO
    // ──────────────────────────────────────────────────────
    console.log("====================================");
    console.log("NO EXISTEN MÁS FICHAS POR CERTIFICAR");
    console.log("Todas las fichas del Excel fueron procesadas.");
    console.log("====================================");

    await page.waitForTimeout(2000);
    await page.close();
    await browser.close();
}

iniciar().catch(err => {
    console.error("[ERROR FATAL]", err.message);
    process.exit(1);
});
