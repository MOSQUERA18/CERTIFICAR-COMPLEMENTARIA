    import { chromium } from "playwright";
    import dotenv from "dotenv";
    import { leerFichas } from "./datos/excel.js";
    import XLSX from "xlsx";
    import path from "path";
    import os from "os";
    import fs from "fs";

    dotenv.config();
    // =========================
    // GUARDAR RESULTADO EN EXCEL
    // =========================

    function guardarResultado(ficha, resultado) {

        const rutaDescargas = path.join(
            os.homedir(),
            "Downloads"
        );

        const rutaArchivo = path.join(
            rutaDescargas,
            "resultadoscertificacioncomplementaria.xlsx"
        );

        let datos = [];

        // Si el archivo ya existe, leerlo
        if (fs.existsSync(rutaArchivo)) {

            const workbookExistente = XLSX.readFile(
                rutaArchivo
            );

            const nombreHoja =
                workbookExistente.SheetNames[0];

            const hojaExistente =
                workbookExistente.Sheets[nombreHoja];

            datos = XLSX.utils.sheet_to_json(
                hojaExistente
            );
        }

        // Agregar nuevo resultado
        datos.push({
            FICHA: ficha,
            RESULTADO: resultado
        });

        // Crear nuevo libro
        const workbook = XLSX.utils.book_new();

        const hoja = XLSX.utils.json_to_sheet(
            datos
        );

        XLSX.utils.book_append_sheet(
            workbook,
            hoja,
            "Resultados"
        );

        // Guardar
        XLSX.writeFile(
            workbook,
            rutaArchivo
        );

        console.log(
            "Resultado guardado en:",
            rutaArchivo
        );
    }





    async function iniciar() {

        const fichas = leerFichas();

        console.log("Fichas encontradas:", fichas);


        // =========================
        // ABRIR NAVEGADOR
        // =========================

        const browser = await chromium.launch({
            headless: false,
            slowMo: 500
        });

        const page = await browser.newPage();


        // =========================
        // ABRIR SOFIA PLUS
        // =========================

        await page.goto(
            "http://senasofiaplus.edu.co/sofia-public/"
        );

        await page.waitForTimeout(3000);


        // =========================
        // FORMULARIO DE INGRESO
        // =========================

        const frame = page.frameLocator(
            "#registradoBox1"
        );


        // =========================
        // USUARIO
        // =========================

        await frame.locator("#username")
            .fill(process.env.USUARIO);


        // =========================
        // CONTRASEÑA
        // =========================

        await frame.locator(
            'input[name="josso_password"]'
        )
        .fill(process.env.PASSWORD);


        console.log("Usuario y contraseña colocados correctamente.");



            await frame.locator(
        'input[name="ingresar"]'
    )
    .click();



    await page.waitForTimeout(5000);


        // =========================
    // SELECCIONAR ROL
    // =========================


    await page.locator(
        "#seleccionRol\\:roles"
    )
    .selectOption("18");



    await page.waitForLoadState(
        "networkidle"
    );


    await page.waitForTimeout(3000);

    
    // =========================
    // PRIMER CERTIFICACIÓN
    // =========================

    await page.locator(
        "span.menuPrimario",
        {
            hasText: "Certificación"
        }
    ).click();

    await page.waitForTimeout(1000);
    
    // =========================
    // SEGUNDO CERTIFICACIÓN
    // =========================

    const menuCertificacion = page.locator(
        "li.active"
    ).filter({
        has: page.locator(
            "span.menuPrimario",
            {
                hasText: "Certificación"
            }
        )
    });

    await menuCertificacion.locator(
        "ul.nav-second-level > li:first-child > a"
    ).click();

    await page.waitForTimeout(1000);


    // =========================
    // CERTIFICAR FORMACIÓN COMPLEMENTARIA
    // =========================

    await page.locator(
        '[id="92146Opcion"]'
    ).click();

    await page.waitForTimeout(2000);

    // =========================
    // FRAME CONTENIDO
    // =========================

    const frame1 = page.frameLocator("#contenido");

    // =========================
    // PROCESAR TODAS LAS FICHAS
    // =========================

    for (let i = 0; i < fichas.length; i++) {

        const numeroFicha = fichas[i];

        console.log("====================================");
        console.log(`Procesando ficha ${i + 1} de ${fichas.length}`);
        console.log(`Ficha: ${numeroFicha}`);
        console.log("====================================");


    // =========================
    // ABRIR CONSULTA DE FICHA
    // =========================

    await frame1.locator(
        '[id="frmContenido:cmdlnkFicha"]'
    ).click();

    await page.waitForTimeout(2000);



    // =========================
    // BUSCAR FRAME DE LA MODAL
    // =========================

    const modalFrame = page.frames().find(
        frame =>
            frame.name() === "modalDialogContentvFichas"
    );

    if (!modalFrame) {
        throw new Error(
            "No se encontró el modal de búsqueda de ficha"
        );
    }


    // =========================
    // INPUT CÓDIGO DE FICHA
    // =========================

    const inputFicha = modalFrame.locator(
        "#form\\:codigoFichaITX"
    );

    await inputFicha.waitFor({
        state: "attached",
        timeout: 10000
    });


    // =========================
    // COLOCAR NÚMERO DE FICHA
    // =========================

    await inputFicha.fill(
        String(numeroFicha)
    );

    console.log(
        "Ficha colocada en el input:",
        numeroFicha
    );

    const btnBuscar =
        modalFrame.locator(
            "#form\\:buscarCBT"
        );



    await btnBuscar.click();

        // =========================
    // SELECCIONAR RESULTADO
    // =========================


    const btnSeleccionar =
    modalFrame.locator(
        "#form\\:dtFichas\\:0\\:cmdlnkShow"
    );



    await btnSeleccionar.waitFor({

        state:"attached",

        timeout:15000

    });



    await btnSeleccionar.click();

    // =========================
    // CONSULTAR APRENDICES
    // =========================

    const btnConsultarAprendices = frame1.locator(
        "#frmContenido\\:cmdlnkSearchPrograma"
    );

    await btnConsultarAprendices.waitFor({
        state: "visible",
        timeout: 10000
    });

    await btnConsultarAprendices.click();

    console.log("Botón 'Consultar Aprendices' presionado.");

    await page.waitForTimeout(2000);


    // =========================
    // SELECCIONAR "GENERAR DOCUMENTO"
    // PARA TODOS LOS APRENDICES
    // =========================

    const selectsGenerarDocumento = frame1.locator(
        'select[id*=":selOpcionAprobacion"]'
    );

    const cantidadAprendices = await selectsGenerarDocumento.count();

    console.log(
        `Aprendices encontrados: ${cantidadAprendices}`
    );

    for (let i = 0; i < cantidadAprendices; i++) {

        const select = selectsGenerarDocumento.nth(i);

        await select.waitFor({
            state: "visible",
            timeout: 10000
        });

        await select.selectOption(
            "GENERAR_DOCUMENTO"
        );

        console.log(
            `Aprendiz ${i + 1}: Generar Documento seleccionado`
        );

        await page.waitForTimeout(1000);
    }


        // =========================
        // CERTIFICAR APRENDICES
        // =========================

        const btnCertificarAprendices = frame1.locator(
            "#frmContenido\\:cmdlnkAprobar"
        );

        await btnCertificarAprendices.waitFor({
            state: "visible",
            timeout: 10000
        });

        await btnCertificarAprendices.click();

        console.log("Botón 'Certificar Aprendices' presionado.");


        // =========================
// BUSCAR MENSAJE DE RESULTADO
// =========================

const mensajeResultado = frame1.locator(
    '[id$=":messages"]'
);

try {

    await mensajeResultado.first().waitFor({
        state: "visible",
        timeout: 15000
    });

    const resultado = (
        await mensajeResultado.first().innerText()
    ).trim();

    console.log(
        "===================================="
    );

    console.log(
        "RESULTADO DE LA CERTIFICACIÓN:"
    );

    console.log(
        resultado
    );

    console.log(
        "===================================="
    );


    // =========================
    // GUARDAR RESULTADO EN EXCEL
    // =========================

    guardarResultado(
        numeroFicha,
        resultado
    );

    console.log(
        `Resultado de ficha ${numeroFicha} guardado correctamente.`
    );

} catch (error) {

    console.log(
        `No se encontró el mensaje de resultado para la ficha ${numeroFicha}.`
    );

    console.log(
        "Error:",
        error.message
    );

    // Guardar igualmente el error en Excel
    guardarResultado(
        numeroFicha,
        "No se encontró mensaje de resultado"
    );
}


    // =========================
    // ESPERA ANTES DE SIGUIENTE FICHA
    // =========================

    await page.waitForTimeout(1500);


    }

    // =========================
    // NO HAY MÁS FICHAS
    // =========================

    console.log("====================================");
    console.log("NO EXISTEN MÁS FICHAS POR CERTIFICAR");
    console.log("Todas las fichas del Excel fueron procesadas.");
    console.log("====================================");

    // Esperar un momento para que se vea el mensaje
    await page.waitForTimeout(2000);

    // Cerrar pestaña
    await page.close();

    // Cerrar navegador
    await browser.close();
    }

    iniciar();