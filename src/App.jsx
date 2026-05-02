import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAmHBYrPGipQ3Qk5ttGkaYmiY0b04lZfLg",
  authDomain: "prestamos-eye.firebaseapp.com",
  projectId: "prestamos-eye",
  storageBucket: "prestamos-eye.firebasestorage.app",
  messagingSenderId: "710212000102",
  appId: "1:710212000102:web:ca2b0ee925202f829490a7"
};

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

const CONFIG_DEFAULT = {
  nombreApp: "Préstamos E & F",
  clave: "1234",
  telefonoAdmin: "8090000000",
  fechaVencimiento: "2026-12-31"
};

function App() {
  const [clientes, setClientes] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [verPapelera, setVerPapelera] = useState(false);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [clave, setClave] = useState("");
  const [autenticado, setAutenticado] = useState(() => sessionStorage.getItem("prestamoLogin") === "si");
  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("configPrestamos") || JSON.stringify(CONFIG_DEFAULT));
    } catch {
      return CONFIG_DEFAULT;
    }
  });
  const [nuevoNombreApp, setNuevoNombreApp] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    cedula: "",
    monto: "",
    cuotas: 15,
    ganancia: 60,
    mora: 1,
    fechaInicio: new Date().toISOString().slice(0, 10),
    nota: ""
  });

  useEffect(() => {
    localStorage.setItem("configPrestamos", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    cargarTodo();
  }, []);

  const dinero = (valor) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2
    }).format(Number(valor || 0));

  const hoyISO = () => new Date().toISOString().slice(0, 10);

  const diasEntre = (fechaInicio, fechaFinal) => {
    const f1 = new Date(fechaInicio + "T00:00:00");
    const f2 = new Date(fechaFinal + "T00:00:00");
    return Math.floor((f2 - f1) / (1000 * 60 * 60 * 24));
  };

  const fechaCuota = (fechaInicio, numeroCuota) => {
    const fecha = new Date(fechaInicio + "T00:00:00");
    fecha.setDate(fecha.getDate() + numeroCuota * 7);
    return fecha.toISOString().slice(0, 10);
  };

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const clientesSnap = await getDocs(collection(db, "clientes"));
      const papeleraSnap = await getDocs(collection(db, "papelera"));

      const clientesData = [];
      clientesSnap.forEach((d) => clientesData.push({ id: d.id, ...d.data() }));

      const papeleraData = [];
      papeleraSnap.forEach((d) => papeleraData.push({ id: d.id, ...d.data() }));

      clientesData.sort((a, b) => String(b.creado || "").localeCompare(String(a.creado || "")));
      papeleraData.sort((a, b) => String(b.eliminadoEn || "").localeCompare(String(a.eliminadoEn || "")));

      setClientes(clientesData);
      setPapelera(papeleraData);
    } catch (e) {
      alert("No se pudo cargar la nube. Revisa internet, Firebase o las reglas de Firestore.");
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const calcular = (cliente) => {
    const cuotasPagadas = Number(cliente.pagado || 0);
    const pagoSemanal = Number(cliente.pagoSemanal || 0);
    const pagado = cuotasPagadas * pagoSemanal;
    const saldoSinMora = Math.max(Number(cliente.total || 0) - pagado, 0);

    let diasAtrasados = 0;
    let cuotasAtrasadas = 0;

    for (let i = cuotasPagadas + 1; i <= Number(cliente.cuotas || 0); i++) {
      const vencimiento = fechaCuota(cliente.fechaInicio, i);
      const dias = diasEntre(vencimiento, hoyISO());
      if (dias > 0) {
        cuotasAtrasadas += 1;
        diasAtrasados += dias;
      }
    }

    const moraDiaria = saldoSinMora * (Number(cliente.mora || 0) / 100);
    const moraTotal = diasAtrasados * moraDiaria;
    const pendienteTotal = saldoSinMora + moraTotal;
    const proximaCuotaNumero = cuotasPagadas < Number(cliente.cuotas || 0) ? cuotasPagadas + 1 : Number(cliente.cuotas || 0);
    const proximaFecha = cuotasPagadas < Number(cliente.cuotas || 0) ? fechaCuota(cliente.fechaInicio, proximaCuotaNumero) : "Saldado";
    const pagaHoy = proximaFecha === hoyISO() && pendienteTotal > 0;

    return { pagado, saldoSinMora, moraDiaria, moraTotal, pendienteTotal, cuotasAtrasadas, diasAtrasados, proximaCuotaNumero, proximaFecha, pagaHoy };
  };

  const entrar = () => {
    if (clave === config.clave) {
      sessionStorage.setItem("prestamoLogin", "si");
      setAutenticado(true);
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const salir = () => {
    sessionStorage.removeItem("prestamoLogin");
    setAutenticado(false);
    setClave("");
  };

  const guardarConfiguracion = () => {
    const nombreFinal = nuevoNombreApp.trim() || config.nombreApp;
    const claveFinal = nuevaClave.trim() || config.clave;
    const telefonoFinal = (document.getElementById("telefonoAdminInput")?.value || config.telefonoAdmin || "8090000000").trim();
    const vencimientoFinal = document.getElementById("fechaVencimientoInput")?.value || config.fechaVencimiento || "2026-12-31";

    if (claveFinal.length < 4) {
      alert("La contraseña debe tener mínimo 4 caracteres.");
      return;
    }

    setConfig({
      nombreApp: nombreFinal,
      clave: claveFinal,
      telefonoAdmin: telefonoFinal,
      fechaVencimiento: vencimientoFinal
    });
    setNuevoNombreApp("");
    setNuevaClave("");
    setMostrarConfig(false);
    alert("Configuración guardada.");
  };

  const suscripcionVencida = () => {
    const vencimiento = config.fechaVencimiento || "2026-12-31";
    return hoyISO() > vencimiento;
  };

  const diasRestantesSuscripcion = () => {
    const vencimiento = config.fechaVencimiento || "2026-12-31";
    return diasEntre(hoyISO(), vencimiento);
  };

  const contactarAdminSuscripcion = () => {
    let tel = String(config.telefonoAdmin || "8090000000").replace(/\D/g, "");
    if (tel.length === 10 && !tel.startsWith("1")) tel = "1" + tel;
    const mensaje = `Hola, quiero renovar mi suscripción de ${config.nombreApp}.`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const guardarPrestamo = async () => {
    if (!form.nombre.trim() || !form.telefono.trim() || !form.monto || !form.cuotas) {
      alert("Completa nombre, teléfono, monto y cuotas.");
      return;
    }

    const monto = Number(form.monto);
    const cuotas = Number(form.cuotas);
    const ganancia = Number(form.ganancia);
    const mora = Number(form.mora);

    if (monto <= 0 || cuotas <= 0) {
      alert("El monto y las cuotas deben ser mayores que cero.");
      return;
    }

    const total = monto * (1 + ganancia / 100);
    const pagoSemanal = total / cuotas;

    const nuevo = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      cedula: form.cedula.trim(),
      nota: form.nota.trim(),
      monto,
      cuotas,
      ganancia,
      mora,
      fechaInicio: form.fechaInicio,
      total,
      pagoSemanal,
      pagado: 0,
      creado: new Date().toISOString(),
      creadoServidor: serverTimestamp()
    };

    await addDoc(collection(db, "clientes"), nuevo);

    setForm({
      nombre: "",
      telefono: "",
      cedula: "",
      monto: "",
      cuotas: 15,
      ganancia: 60,
      mora: 1,
      fechaInicio: hoyISO(),
      nota: ""
    });

    await cargarTodo();
  };

  const marcarPago = async (cliente) => {
    if (!confirm(`¿Confirmas marcar una cuota pagada para ${cliente.nombre}?`)) return;
    await updateDoc(doc(db, "clientes", cliente.id), {
      pagado: Math.min(Number(cliente.pagado || 0) + 1, Number(cliente.cuotas || 0))
    });
    await cargarTodo();
  };

  const quitarPago = async (cliente) => {
    if (!confirm(`¿Confirmas quitar el último pago registrado de ${cliente.nombre}?`)) return;
    await updateDoc(doc(db, "clientes", cliente.id), {
      pagado: Math.max(Number(cliente.pagado || 0) - 1, 0)
    });
    await cargarTodo();
  };

  const moverPapelera = async (cliente) => {
    if (!confirm(`¿Mover el préstamo de ${cliente.nombre} a la papelera?`)) return;

    const copia = { ...cliente, eliminadoEn: new Date().toISOString() };
    delete copia.id;

    await addDoc(collection(db, "papelera"), copia);
    await deleteDoc(doc(db, "clientes", cliente.id));
    await cargarTodo();
  };

  const restaurar = async (cliente) => {
    if (!confirm(`¿Restaurar el préstamo de ${cliente.nombre}?`)) return;

    const copia = { ...cliente, restauradoEn: new Date().toISOString() };
    delete copia.id;
    delete copia.eliminadoEn;

    await addDoc(collection(db, "clientes"), copia);
    await deleteDoc(doc(db, "papelera", cliente.id));
    await cargarTodo();
  };

  const borrarDefinitivo = async (cliente) => {
    if (!confirm(`¿Borrar definitivamente el préstamo de ${cliente.nombre}? Esta acción no se puede deshacer.`)) return;
    await deleteDoc(doc(db, "papelera", cliente.id));
    await cargarTodo();
  };

  const vaciarPapelera = async () => {
    if (!confirm("¿Vaciar toda la papelera definitivamente?")) return;
    for (const p of papelera) {
      await deleteDoc(doc(db, "papelera", p.id));
    }
    await cargarTodo();
  };

  const abrirWhatsApp = (telefono, mensaje) => {
    let tel = String(telefono || "").replace(/\D/g, "");
    if (tel.length === 10 && !tel.startsWith("1")) tel = "1" + tel;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const enviarRecordatorio = (cliente) => {
    if (!confirm(`¿Enviar recordatorio por WhatsApp a ${cliente.nombre}?`)) return;

    const mensaje = `⏰ *RECORDATORIO DE PAGO*

Hola ${cliente.nombre},

💵 Cuota: ${dinero(cliente.pagoSemanal)}
📅 Fecha: ${new Date().toLocaleDateString()}

Gracias.`;

    abrirWhatsApp(cliente.telefono, mensaje);
  };

  const enviarCobro = (cliente) => {
    if (!confirm(`¿Enviar aviso de cobro por WhatsApp a ${cliente.nombre}?`)) return;

    const data = calcular(cliente);
    const mensaje = `📌 *AVISO DE COBRO*

👤 Cliente: ${cliente.nombre}

💵 Cuota semanal: ${dinero(cliente.pagoSemanal)}
📅 Próxima fecha de pago: ${data.proximaFecha}

Favor realizar su pago. Gracias.`;

    abrirWhatsApp(cliente.telefono, mensaje);
  };

  const enviarRecibo = (cliente) => {
    if (!confirm(`¿Enviar recibo de pago por WhatsApp a ${cliente.nombre}?`)) return;

    const mensaje = `🧾 *RECIBO DE PAGO*

🏦 ${config.nombreApp}

👤 Cliente: ${cliente.nombre}

💵 Cuota pagada: ${dinero(cliente.pagoSemanal)}
📅 Fecha: ${new Date().toLocaleDateString()}

🙏 Gracias por su pago.`;

    abrirWhatsApp(cliente.telefono, mensaje);
  };

  const compartirApp = async () => {
    const link = window.location.href;
    const texto = `📲 Usa ${config.nombreApp}: ${link}`;

    if (navigator.share) {
      await navigator.share({ title: config.nombreApp, text: texto, url: link }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(link);
      alert("Link copiado. Ahora puedes pegarlo en WhatsApp.");
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    String(c.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    String(c.telefono || "").includes(busqueda) ||
    String(c.cedula || "").includes(busqueda)
  );

  const resumen = useMemo(() => {
    return clientes.reduce(
      (acc, c) => {
        const data = calcular(c);
        acc.prestado += Number(c.monto || 0);
        acc.total += Number(c.total || 0);
        acc.pagado += data.pagado;
        acc.mora += data.moraTotal;
        acc.pendiente += data.pendienteTotal;
        acc.atrasados += data.cuotasAtrasadas > 0 ? 1 : 0;
        acc.pagosHoy += data.pagaHoy ? 1 : 0;
        return acc;
      },
      { prestado: 0, total: 0, pagado: 0, mora: 0, pendiente: 0, atrasados: 0, pagosHoy: 0 }
    );
  }, [clientes]);

  const pagosHoy = clientes.filter((c) => calcular(c).pagaHoy);
  const atrasados = clientes.filter((c) => calcular(c).cuotasAtrasadas > 0);

  if (!autenticado) {
    return (
      <div className="loginPage">
        <div className="loginBox">
          <h1>{config.nombreApp}</h1>
          <p>Ingrese la contraseña para acceder.</p>
          <input
            type="password"
            placeholder="Contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
          />
          <button onClick={entrar}>Entrar</button>
          <small>Clave inicial: 1234</small>
        </div>
        <style>{estilos}</style>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="app">
        <div className="card">
          <h2>Cargando nube...</h2>
        </div>
        <style>{estilos}</style>
      </div>
    );
  }

  if (verPapelera) {
    return (
      <div className="app">
        <header className="header">
          <div>
            <h1>Papelera</h1>
            <p>Préstamos eliminados temporalmente.</p>
          </div>
        </header>

        <button onClick={() => setVerPapelera(false)} className="gris">Volver</button>
        {papelera.length > 0 && <button onClick={vaciarPapelera} className="rojoBtn">Vaciar papelera</button>}
        {papelera.length === 0 && <section className="card"><p>No hay préstamos eliminados.</p></section>}

        {papelera.map((p) => (
          <section key={p.id} className="card">
            <h2>{p.nombre}</h2>
            <p>{p.telefono}</p>
            <p>Monto: <b>{dinero(p.monto)}</b></p>
            <button onClick={() => restaurar(p)} className="verdeBtn">Restaurar</button>
            <button onClick={() => borrarDefinitivo(p)} className="rojoBtn">Borrar definitivo</button>
          </section>
        ))}

        <style>{estilos}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>{config.nombreApp}</h1>
          <p>Control de préstamos en la nube, cuotas, mora automática y WhatsApp.</p>
        </div>
        <div className="headerBtns">
          <button className="configBtn" onClick={() => setMostrarConfig(!mostrarConfig)}>Config</button>
          <button className="salir" onClick={salir}>Salir</button>
        </div>
      </header>

      <section className={suscripcionVencida() ? "suscripcion vencida" : "suscripcion activa"}>
        <h2>{suscripcionVencida() ? "🚫 Suscripción vencida" : "✅ Suscripción activa"}</h2>
        <p>Vence: <b>{config.fechaVencimiento || "2026-12-31"}</b></p>
        {!suscripcionVencida() && <p>Días restantes: <b>{diasRestantesSuscripcion()}</b></p>}
        {suscripcionVencida() && <button className="verdeBtn" onClick={contactarAdminSuscripcion}>Renovar por WhatsApp</button>}
      </section>

      {mostrarConfig && (
        <section className="card">
          <h2>⚙️ Configuración</h2>
          <label>Nombre de la app</label>
          <input placeholder={config.nombreApp} value={nuevoNombreApp} onChange={(e) => setNuevoNombreApp(e.target.value)} />
          <label>Nueva contraseña</label>
          <input type="password" placeholder="Mínimo 4 caracteres" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} />
          <label>Teléfono del administrador para renovaciones</label>
          <input id="telefonoAdminInput" placeholder={config.telefonoAdmin || "8090000000"} defaultValue={config.telefonoAdmin || ""} />
          <label>Fecha de vencimiento de la suscripción</label>
          <input id="fechaVencimientoInput" type="date" defaultValue={config.fechaVencimiento || "2026-12-31"} />
          <button onClick={guardarConfiguracion}>Guardar configuración</button>
          <p className="nota">Si dejas un campo vacío, se conserva el valor actual.</p>
        </section>
      )}

      {suscripcionVencida() && <section className="card"><h2>Acceso bloqueado</h2><p>La suscripción está vencida. Renueva para volver a crear préstamos, cobrar y enviar recibos.</p></section>}

      {!suscripcionVencida() && (resumen.pagosHoy > 0 || resumen.atrasados > 0) && (
        <section className="alerta">
          <h2>🔔 Alertas</h2>
          <p>Pagos de hoy: <b>{resumen.pagosHoy}</b></p>
          <p>Atrasados: <b>{resumen.atrasados}</b></p>
        </section>
      )}

      {!suscripcionVencida() && pagosHoy.length > 0 && (
        <section className="card">
          <h2>⏰ Pagos de hoy</h2>
          {pagosHoy.map((c) => (
            <div key={c.id} className="miniFila">
              <div>
                <b>{c.nombre}</b>
                <p>{dinero(c.pagoSemanal)} vence hoy</p>
              </div>
              <button className="verdeBtn miniBtn" onClick={() => enviarRecordatorio(c)}>Recordar</button>
            </div>
          ))}
        </section>
      )}

      {!suscripcionVencida() && atrasados.length > 0 && (
        <section className="card atrasosBox">
          <h2>🚨 Clientes atrasados</h2>
          {atrasados.map((c) => {
            const d = calcular(c);
            return (
              <div key={c.id} className="miniFila">
                <div>
                  <b>{c.nombre}</b>
                  <p>{d.diasAtrasados} día(s) atrasado(s) - Mora: {dinero(d.moraTotal)}</p>
                </div>
                <button className="azulBtn miniBtn" onClick={() => enviarCobro(c)}>Cobrar</button>
              </div>
            );
          })}
        </section>
      )}

      {!suscripcionVencida() && <section className="grid resumen">
        <Box titulo="Clientes" valor={clientes.length} />
        <Box titulo="Pagos hoy" valor={resumen.pagosHoy} />
        <Box titulo="Prestado" valor={dinero(resumen.prestado)} />
        <Box titulo="Pagado" valor={dinero(resumen.pagado)} />
        <Box titulo="Mora" valor={dinero(resumen.mora)} />
        <Box titulo="Pendiente" valor={dinero(resumen.pendiente)} />
      </section>}

      {!suscripcionVencida() && <section className="card">
        <h2>Nuevo préstamo</h2>

        <label>Nombre del cliente</label>
        <input placeholder="Ej: Juan Pérez" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />

        <label>Teléfono</label>
        <input placeholder="Ej: 8091234567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />

        <label>Cédula opcional</label>
        <input placeholder="000-0000000-0" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />

        <label>Monto prestado</label>
        <input type="number" placeholder="Ej: 10000" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />

        <label>Cantidad de cuotas</label>
        <input type="number" value={form.cuotas} onChange={(e) => setForm({ ...form, cuotas: e.target.value })} />

        <label>% de ganancia</label>
        <input type="number" value={form.ganancia} onChange={(e) => setForm({ ...form, ganancia: e.target.value })} />

        <label>% de mora diaria sobre saldo pendiente</label>
        <input type="number" value={form.mora} onChange={(e) => setForm({ ...form, mora: e.target.value })} />

        <label>Fecha de inicio</label>
        <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />

        <label>Nota opcional</label>
        <input placeholder="Dirección, garantía, referencia..." value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />

        <div className="preview">
          <p>Total a cobrar sin mora: <b>{dinero(Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100))}</b></p>
          <p>Cobro por cuota: <b>{dinero((Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100)) / Number(form.cuotas || 1))}</b></p>
          <p>Mora diaria estimada: <b>{dinero((Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100)) * (Number(form.mora || 0) / 100))}</b></p>
        </div>

        <button onClick={guardarPrestamo}>Guardar préstamo</button>
      </section>}

      {!suscripcionVencida() && <div className="accionesTop">
        <button className="verdeBtn" onClick={compartirApp}>Compartir app</button>
        <button className="gris" onClick={cargarTodo}>Actualizar nube</button>
        <button className="azulBtn" onClick={() => setVerPapelera(true)}>Papelera ({papelera.length})</button>
      </div>

      </div>}

      {!suscripcionVencida() && <input className="buscar" placeholder="Buscar cliente, teléfono o cédula" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      {!suscripcionVencida() && clientesFiltrados.map((cliente) => {
        const data = calcular(cliente);
        const estado = data.pendienteTotal <= 0 ? "Saldado" : data.cuotasAtrasadas > 0 ? "Atrasado" : data.pagaHoy ? "Pago hoy" : "Al día";

        return (
          <section key={cliente.id} className="card cliente">
            <div className="clienteTop">
              <div>
                <h2>{cliente.nombre}</h2>
                <p>📞 {cliente.telefono}</p>
                {cliente.cedula && <p>Cédula: {cliente.cedula}</p>}
              </div>
              <span className={estado === "Atrasado" ? "rojo" : estado === "Pago hoy" ? "amarillo" : "verde"}>{estado}</span>
            </div>

            <div className="datos">
              <p>Monto prestado: <b>{dinero(cliente.monto)}</b></p>
              <p>Total sin mora: <b>{dinero(cliente.total)}</b></p>
              <p>Cobro por cuota: <b>{dinero(cliente.pagoSemanal)}</b></p>
              <p>Cuotas pagadas: <b>{cliente.pagado}/{cliente.cuotas}</b></p>
              <p>Próxima cuota: <b>#{data.proximaCuotaNumero} - {data.proximaFecha}</b></p>
              <p>Saldo pendiente sin mora: <b>{dinero(data.saldoSinMora)}</b></p>
              <p>Mora diaria: <b>{cliente.mora}% = {dinero(data.moraDiaria)}</b></p>
              <p>Días atrasados acumulados: <b>{data.diasAtrasados}</b></p>
              <p>Mora acumulada: <b>{dinero(data.moraTotal)}</b></p>
              <p>Total pendiente con mora: <b>{dinero(data.pendienteTotal)}</b></p>
              {cliente.nota && <p>Nota: <b>{cliente.nota}</b></p>}
            </div>

            <button onClick={() => marcarPago(cliente)}>Marcar cuota pagada</button>
            <button onClick={() => quitarPago(cliente)} className="gris">Quitar último pago</button>
            <button onClick={() => enviarRecordatorio(cliente)} className="verdeBtn">Recordatorio por WhatsApp</button>
            <button onClick={() => enviarCobro(cliente)} className="azulBtn">Cobrar por WhatsApp</button>
            <button onClick={() => enviarRecibo(cliente)} className="azulBtn">Enviar recibo por WhatsApp</button>
            <button onClick={() => moverPapelera(cliente)} className="rojoBtn">Mover a papelera</button>
          </section>
        );
      })}

      <style>{estilos}</style>
    </div>
  );
}

function Box({ titulo, valor }) {
  return (
    <div className="box">
      <small>{titulo}</small>
      <h3>{valor}</h3>
    </div>
  );
}

const estilos = `
*{box-sizing:border-box}
body{margin:0}
.app{min-height:100vh;background:#f1f5f9;padding:16px;font-family:Arial,sans-serif;color:#0f172a}
.header{background:linear-gradient(135deg,#7f1d1d,#111827);color:white;padding:20px;border-radius:22px;margin-bottom:14px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.header h1{margin:0;font-size:26px}
.header p{margin:6px 0 0;color:#e5e7eb}
.headerBtns{display:flex;gap:8px}
.salir,.configBtn{width:auto;padding:9px 13px;background:#334155;margin-top:0}
.configBtn{background:#2563eb}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.box,.card{background:white;border-radius:18px;padding:14px;box-shadow:0 1px 5px rgba(0,0,0,.08)}
.box small{color:#64748b}
.box h3{margin:5px 0 0;font-size:17px}
.card{margin-top:14px}
.alerta{background:#fff7ed;border:1px solid #fdba74;padding:14px;border-radius:18px;margin-bottom:14px}
.alerta h2{margin-top:0}
.atrasosBox{border:1px solid #fecaca}
.miniFila{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 0;border-top:1px solid #e2e8f0}
.miniFila:first-of-type{border-top:none}
.miniFila p{margin:4px 0 0;color:#64748b;font-size:13px}
.miniBtn{width:auto;min-width:90px;padding:9px 11px;margin-top:0}
label{display:block;font-size:13px;font-weight:bold;color:#334155;margin-top:10px}
input{width:100%;padding:13px;border-radius:13px;border:1px solid #cbd5e1;margin-top:5px;font-size:16px}
.buscar{margin-top:14px}
.preview{background:#f8fafc;padding:12px;border-radius:14px;margin-top:12px}
.preview p,.datos p{margin:7px 0}
button{width:100%;padding:13px;border:0;border-radius:13px;margin-top:8px;background:#7f1d1d;color:white;font-weight:bold;font-size:15px}
.gris{background:#475569}
.verdeBtn{background:#16a34a}
.azulBtn{background:#2563eb}
.rojoBtn{background:#dc2626}
.accionesTop{display:grid;grid-template-columns:repeat(1,1fr);gap:8px;margin-top:14px}
.clienteTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.cliente h2{margin:0}
.clienteTop p{margin:5px 0 0;color:#64748b}
.verde,.rojo,.amarillo{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:bold;color:white;white-space:nowrap}
.verde{background:#16a34a}
.rojo{background:#dc2626}
.amarillo{background:#ca8a04}
.nota{color:#64748b;font-size:13px;margin-bottom:0}
.suscripcion{padding:14px;border-radius:18px;margin-bottom:14px;box-shadow:0 1px 5px rgba(0,0,0,.08)}
.suscripcion h2{margin:0 0 6px}
.suscripcion p{margin:5px 0}
.suscripcion.activa{background:#ecfdf5;border:1px solid #86efac}
.suscripcion.vencida{background:#fef2f2;border:1px solid #fecaca}
.loginPage{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;padding:20px;font-family:Arial,sans-serif}
.loginBox{background:white;max-width:420px;width:100%;padding:22px;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.loginBox h1{margin-top:0}
.loginBox small{display:block;margin-top:12px;color:#64748b}
@media(min-width:700px){
  .app{max-width:900px;margin:auto}
  .grid{grid-template-columns:repeat(3,1fr)}
  .accionesTop{grid-template-columns:repeat(3,1fr)}
}
`;

createRoot(document.getElementById("root")).render(<App />);

