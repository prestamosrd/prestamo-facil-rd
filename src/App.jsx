import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const CONFIG_DEFAULT = {
  nombreApp: "Préstamos E & F",
  clave: "1234"
};

function App() {
  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("configPrestamos") || JSON.stringify(CONFIG_DEFAULT));
    } catch {
      return CONFIG_DEFAULT;
    }
  });
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [nuevaClave, setNuevaClave] = useState("");
  const [nuevoNombreApp, setNuevoNombreApp] = useState("");

  const [autenticado, setAutenticado] = useState(() => {
    return sessionStorage.getItem("prestamoLogin") === "si";
  });
  const [clave, setClave] = useState("");
  const [verPapelera, setVerPapelera] = useState(false);

  const [clientes, setClientes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("clientesPrestamos") || "[]");
    } catch {
      return [];
    }
  });

  const [papelera, setPapelera] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("papeleraPrestamos") || "[]");
    } catch {
      return [];
    }
  });

  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    monto: "",
    cuotas: 15,
    ganancia: 60,
    mora: 1,
    fechaInicio: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    localStorage.setItem("clientesPrestamos", JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem("configPrestamos", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("papeleraPrestamos", JSON.stringify(papelera));
  }, [papelera]);

  const entrar = () => {
    if (clave === config.clave) {
      sessionStorage.setItem("prestamoLogin", "si");
      setAutenticado(true);
    } else {
      alert("Clave incorrecta");
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

    if (claveFinal.length < 4) {
      alert("La contraseña debe tener mínimo 4 caracteres.");
      return;
    }

    setConfig({ nombreApp: nombreFinal, clave: claveFinal });
    setNuevoNombreApp("");
    setNuevaClave("");
    setMostrarConfig(false);
    alert("Configuración guardada correctamente.");
  };

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

  const calcular = (cliente) => {
    const cuotasPagadas = Number(cliente.pagado || 0);
    const pagado = cuotasPagadas * Number(cliente.pagoSemanal || 0);
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
    const proximaCuotaNumero = cuotasPagadas < cliente.cuotas ? cuotasPagadas + 1 : cliente.cuotas;
    const proximaFecha = cuotasPagadas < cliente.cuotas ? fechaCuota(cliente.fechaInicio, proximaCuotaNumero) : "Saldado";
    const pagaHoy = proximaFecha === hoyISO() && pendienteTotal > 0;

    return {
      pagado,
      saldoSinMora,
      moraDiaria,
      moraTotal,
      pendienteTotal,
      cuotasAtrasadas,
      diasAtrasados,
      proximaCuotaNumero,
      proximaFecha,
      pagaHoy
    };
  };

  const guardar = () => {
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
      id: Date.now(),
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      monto,
      cuotas,
      ganancia,
      mora,
      fechaInicio: form.fechaInicio,
      total,
      pagoSemanal,
      pagado: 0,
      creado: new Date().toISOString()
    };

    setClientes([nuevo, ...clientes]);
    setForm({
      nombre: "",
      telefono: "",
      monto: "",
      cuotas: 15,
      ganancia: 60,
      mora: 1,
      fechaInicio: hoyISO()
    });
  };

  const marcarPago = (id) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    if (!confirm(`¿Confirmas marcar una cuota pagada para ${cliente.nombre}?`)) return;

    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.min(Number(c.pagado || 0) + 1, Number(c.cuotas || 0)) } : c
    ));
  };

  const quitarPago = (id) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    if (!confirm(`¿Confirmas quitar el último pago registrado de ${cliente.nombre}?`)) return;

    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.max(Number(c.pagado || 0) - 1, 0) } : c
    ));
  };

  const enviarAPapelera = (id) => {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    if (confirm("¿Mover este préstamo a la papelera? Podrás recuperarlo después.")) {
      const eliminado = { ...cliente, eliminadoEn: new Date().toISOString() };
      setPapelera([eliminado, ...papelera]);
      setClientes(clientes.filter(c => c.id !== id));
    }
  };

  const restaurarPrestamo = (id) => {
    const cliente = papelera.find(c => c.id === id);
    if (!cliente) return;
    if (!confirm(`¿Confirmas restaurar el préstamo de ${cliente.nombre}?`)) return;

    const restaurado = { ...cliente };
    delete restaurado.eliminadoEn;

    setClientes([restaurado, ...clientes]);
    setPapelera(papelera.filter(c => c.id !== id));
  };

  const borrarDefinitivo = (id) => {
    if (confirm("¿Seguro que deseas borrar definitivamente? Esta acción no se puede deshacer.")) {
      setPapelera(papelera.filter(c => c.id !== id));
    }
  };

  const vaciarPapelera = () => {
    if (confirm("¿Vaciar toda la papelera definitivamente?")) {
      setPapelera([]);
    }
  };

  const abrirWhatsApp = (telefono, mensaje) => {
    let tel = String(telefono || "").replace(/\D/g, "");
    if (tel.length === 10 && !tel.startsWith("1")) tel = "1" + tel;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  // Recordatorio: mensaje suave cuando la cuota vence hoy.
  const enviarRecordatorioHoy = (cliente) => {
    if (!confirm(`¿Enviar recordatorio de pago por WhatsApp a ${cliente.nombre}?`)) return;

    const data = calcular(cliente);
    const mensaje = `⏰ *RECORDATORIO DE PAGO*

Hola ${cliente.nombre}, hoy le corresponde realizar su pago.

💵 Cuota de hoy: ${dinero(cliente.pagoSemanal)}
📅 Fecha: ${hoyISO()}
📉 Balance pendiente: ${dinero(data.pendienteTotal)}

Gracias.`;
    abrirWhatsApp(cliente.telefono, mensaje);
  };

  // Cobro: mensaje más directo para balance pendiente, mora o atraso.
  const enviarCobro = (cliente) => {
    if (!confirm(`¿Enviar aviso de cobro por WhatsApp a ${cliente.nombre}?`)) return;

    const data = calcular(cliente);
    const mensaje = `📌 *AVISO DE COBRO*

👤 Cliente: ${cliente.nombre}
💵 Cuota semanal: ${dinero(cliente.pagoSemanal)}
📅 Próxima cuota: ${data.proximaFecha}
⚠️ Mora acumulada: ${dinero(data.moraTotal)}
📉 Balance pendiente: ${dinero(data.pendienteTotal)}

Favor realizar su pago. Gracias.`;
    abrirWhatsApp(cliente.telefono, mensaje);
  };

  const enviarRecibo = (cliente) => {
    if (!confirm(`¿Enviar recibo de pago por WhatsApp a ${cliente.nombre}?`)) return;

    const data = calcular(cliente);
    const mensaje = `🧾 *RECIBO DE PAGO*

👤 Cliente: ${cliente.nombre}
📞 Teléfono: ${cliente.telefono}

💰 Monto prestado: ${dinero(cliente.monto)}
📊 Total del préstamo: ${dinero(cliente.total)}
💵 Valor de cuota: ${dinero(cliente.pagoSemanal)}
✅ Cuotas pagadas: ${cliente.pagado}/${cliente.cuotas}

⚠️ Mora acumulada: ${dinero(data.moraTotal)}
📉 Balance pendiente: ${dinero(data.pendienteTotal)}

🙏 Gracias por su pago.`;
    abrirWhatsApp(cliente.telefono, mensaje);
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono.includes(busqueda)
  );

  const resumen = useMemo(() => {
    return clientes.reduce((acc, c) => {
      const data = calcular(c);
      acc.prestado += Number(c.monto || 0);
      acc.total += Number(c.total || 0);
      acc.pagado += data.pagado;
      acc.mora += data.moraTotal;
      acc.pendiente += data.pendienteTotal;
      acc.atrasados += data.cuotasAtrasadas > 0 ? 1 : 0;
      acc.pagosHoy += data.pagaHoy ? 1 : 0;
      return acc;
    }, { prestado: 0, total: 0, pagado: 0, mora: 0, pendiente: 0, atrasados: 0, pagosHoy: 0 });
  }, [clientes]);

  const pagosHoy = clientes.filter(c => calcular(c).pagaHoy);
  const atrasados = clientes.filter(c => calcular(c).cuotasAtrasadas > 0);

  if (!autenticado) {
    return (
      <div className="loginPage">
        <div className="loginBox">
          <h1>{config.nombreApp}</h1>
          <p>Ingrese la contraseña para acceder.</p>
          <input type="password" placeholder="Contraseña" value={clave} onChange={e => setClave(e.target.value)} onKeyDown={e => e.key === "Enter" && entrar()} />
          <button onClick={entrar}>Entrar</button>
          <small>Clave inicial: 1234. Luego puedes cambiarla desde Configuración.</small>
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
            <h1>🗑️ Papelera de préstamos</h1>
            <p>Aquí puedes recuperar préstamos eliminados por error.</p>
          </div>
          <button className="salir" onClick={() => setVerPapelera(false)}>Volver</button>
        </header>

        {papelera.length > 0 && <button className="rojoBtn" onClick={vaciarPapelera}>Vaciar papelera</button>}

        {papelera.length === 0 && (
          <section className="card">
            <h2>Papelera vacía</h2>
            <p>No hay préstamos eliminados.</p>
          </section>
        )}

        {papelera.map(cliente => (
          <section key={cliente.id} className="card cliente">
            <h2>{cliente.nombre}</h2>
            <p>📞 {cliente.telefono}</p>
            <p>Monto prestado: <b>{dinero(cliente.monto)}</b></p>
            <p>Total del préstamo: <b>{dinero(cliente.total)}</b></p>
            <p>Eliminado: <b>{cliente.eliminadoEn ? new Date(cliente.eliminadoEn).toLocaleString("es-DO") : "No disponible"}</b></p>
            <button className="verdeBtn" onClick={() => restaurarPrestamo(cliente.id)}>Restaurar préstamo</button>
            <button className="rojoBtn" onClick={() => borrarDefinitivo(cliente.id)}>Borrar definitivamente</button>
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
          <p>Control de préstamos, cuotas, mora automática y WhatsApp.</p>
        </div>
        <div className="headerBtns">
          <button className="papeleraBtn" onClick={() => setVerPapelera(true)}>Papelera ({papelera.length})</button>
          <div className="headerBtns">
          <button className="configBtn" onClick={() => setMostrarConfig(!mostrarConfig)}>Config</button>
          <button className="salir" onClick={salir}>Salir</button>
        </div>
        </div>
      </header>
      {mostrarConfig && (
        <section className="card configPanel">
          <h2>⚙️ Configuración</h2>
          <label>Nombre de la app</label>
          <input
            placeholder={config.nombreApp}
            value={nuevoNombreApp}
            onChange={e => setNuevoNombreApp(e.target.value)}
          />
          <label>Nueva contraseña</label>
          <input
            type="password"
            placeholder="Escribe una nueva contraseña"
            value={nuevaClave}
            onChange={e => setNuevaClave(e.target.value)}
          />
          <button onClick={guardarConfiguracion}>Guardar configuración</button>
          <p className="notaConfig">Si dejas un campo vacío, se conserva el valor actual.</p>
        </section>
      )}

      {(resumen.pagosHoy > 0 || resumen.atrasados > 0) && (
        <section className="alerta">
          <h2>🔔 Alertas de cobro</h2>
          <p>Hoy tienen pago: <b>{resumen.pagosHoy}</b> cliente(s).</p>
          <p>Clientes atrasados: <b>{resumen.atrasados}</b>.</p>
        </section>
      )}

      {pagosHoy.length > 0 && (
        <section className="card">
          <h2>⏰ Pagos de hoy</h2>
          {pagosHoy.map(c => (
            <div key={c.id} className="miniFila">
              <div>
                <b>{c.nombre}</b>
                <p>{dinero(c.pagoSemanal)} vence hoy</p>
              </div>
              <button className="verdeBtn miniBtn" onClick={() => enviarRecordatorioHoy(c)}>Recordar</button>
            </div>
          ))}
        </section>
      )}

      {atrasados.length > 0 && (
        <section className="card atrasosBox">
          <h2>🚨 Clientes atrasados</h2>
          {atrasados.map(c => {
            const data = calcular(c);
            return (
              <div key={c.id} className="miniFila">
                <div>
                  <b>{c.nombre}</b>
                  <p>{data.diasAtrasados} día(s) atrasado(s) - Mora: {dinero(data.moraTotal)}</p>
                </div>
                <button className="azulBtn miniBtn" onClick={() => enviarCobro(c)}>Cobrar</button>
              </div>
            );
          })}
        </section>
      )}

      <section className="grid resumen">
        <Box titulo="Clientes" valor={clientes.length} />
        <Box titulo="Pagos hoy" valor={resumen.pagosHoy} />
        <Box titulo="Prestado" valor={dinero(resumen.prestado)} />
        <Box titulo="Pagado" valor={dinero(resumen.pagado)} />
        <Box titulo="Mora" valor={dinero(resumen.mora)} />
        <Box titulo="Pendiente" valor={dinero(resumen.pendiente)} />
      </section>

      <section className="card">
        <h2>Nuevo préstamo</h2>

        <label>Nombre del cliente</label>
        <input placeholder="Ej: Juan Pérez" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

        <label>Teléfono</label>
        <input placeholder="Ej: 8091234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />

        <label>Monto prestado</label>
        <input type="number" placeholder="Ej: 10000" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />

        <label>Cantidad de cuotas</label>
        <input type="number" value={form.cuotas} onChange={e => setForm({ ...form, cuotas: e.target.value })} />

        <label>% de ganancia</label>
        <input type="number" value={form.ganancia} onChange={e => setForm({ ...form, ganancia: e.target.value })} />

        <label>% de mora diaria sobre saldo pendiente</label>
        <input type="number" value={form.mora} onChange={e => setForm({ ...form, mora: e.target.value })} />

        <label>Fecha de inicio</label>
        <input type="date" value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} />

        <div className="preview">
          <p>Total a cobrar sin mora: <b>{dinero(Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100))}</b></p>
          <p>Cobro por cuota: <b>{dinero((Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100)) / Number(form.cuotas || 1))}</b></p>
          <p>Mora diaria estimada: <b>{dinero((Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100)) * (Number(form.mora || 0) / 100))}</b></p>
        </div>

        <button onClick={guardar}>Guardar préstamo</button>
      </section>

      <input className="buscar" placeholder="Buscar cliente o teléfono" value={busqueda} onChange={e => setBusqueda(e.target.value)} />

      {clientesFiltrados.map(cliente => {
        const data = calcular(cliente);
        const estado = data.pendienteTotal <= 0 ? "Saldado" : data.cuotasAtrasadas > 0 ? "Atrasado" : data.pagaHoy ? "Pago hoy" : "Al día";

        return (
          <section key={cliente.id} className="card cliente">
            <div className="clienteTop">
              <div>
                <h2>{cliente.nombre}</h2>
                <p>📞 {cliente.telefono}</p>
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
            </div>

            <button onClick={() => marcarPago(cliente.id)}>Marcar cuota pagada</button>
            <button onClick={() => quitarPago(cliente.id)} className="gris">Quitar último pago</button>
            <button onClick={() => enviarRecordatorioHoy(cliente)} className="verdeBtn">Recordatorio por WhatsApp</button>
            <button onClick={() => enviarCobro(cliente)} className="azulBtn">Cobrar por WhatsApp</button>
            <button onClick={() => enviarRecibo(cliente)} className="azulBtn">Enviar recibo por WhatsApp</button>
            <button onClick={() => enviarAPapelera(cliente.id)} className="rojoBtn">Mover a papelera</button>
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
  * { box-sizing: border-box; }
  body { margin: 0; }
  .app { min-height: 100vh; background: #f1f5f9; padding: 16px; font-family: Arial, sans-serif; color: #0f172a; }
  .header { background: linear-gradient(135deg, #7f1d1d, #111827); color: white; padding: 20px; border-radius: 22px; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .header h1 { margin: 0; font-size: 26px; }
  .header p { margin: 6px 0 0; color: #e5e7eb; }
  .headerBtns { display: flex; flex-direction: column; gap: 8px; }
  .salir, .papeleraBtn { width: auto; padding: 9px 13px; background: #334155; margin-top: 0; }
  .papeleraBtn { background: #92400e; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .box, .card { background: white; border-radius: 18px; padding: 14px; box-shadow: 0 1px 5px rgba(0,0,0,.08); }
  .box small { color: #64748b; }
  .box h3 { margin: 5px 0 0; font-size: 17px; }
  .card { margin-top: 14px; }
  .alerta { background: #fff7ed; border: 1px solid #fdba74; padding: 14px; border-radius: 18px; margin-bottom: 14px; }
  .alerta h2 { margin-top: 0; }
  .atrasosBox { border: 1px solid #fecaca; }
  .miniFila { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 10px 0; border-top: 1px solid #e2e8f0; }
  .miniFila:first-of-type { border-top: none; }
  .miniFila p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
  .miniBtn { width: auto; min-width: 90px; padding: 9px 11px; margin-top: 0; }
  label { display: block; font-size: 13px; font-weight: bold; color: #334155; margin-top: 10px; }
  input { width: 100%; padding: 13px; border-radius: 13px; border: 1px solid #cbd5e1; margin-top: 5px; font-size: 16px; }
  .buscar { margin-top: 14px; }
  .preview { background: #f8fafc; padding: 12px; border-radius: 14px; margin-top: 12px; }
  .preview p, .datos p { margin: 7px 0; }
  button { width: 100%; padding: 13px; border: 0; border-radius: 13px; margin-top: 8px; background: #7f1d1d; color: white; font-weight: bold; font-size: 15px; }
  .gris { background: #475569; }
  .verdeBtn { background: #16a34a; }
  .azulBtn { background: #2563eb; }
  .rojoBtn { background: #dc2626; }
  .clienteTop { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .cliente h2 { margin: 0; }
  .clienteTop p { margin: 5px 0 0; color: #64748b; }
  .verde, .rojo, .amarillo { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; color: white; white-space: nowrap; }
  .verde { background: #16a34a; }
  .rojo { background: #dc2626; }
  .amarillo { background: #ca8a04; }
  .loginPage { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; padding: 20px; font-family: Arial, sans-serif; }
  .loginBox { background: white; max-width: 420px; width: 100%; padding: 22px; border-radius: 22px; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
  .loginBox h1 { margin-top: 0; }
  .loginBox small { display: block; margin-top: 12px; color: #64748b; }
  @media (min-width: 700px) {
    .app { max-width: 900px; margin: auto; }
    .grid { grid-template-columns: repeat(3, 1fr); }
    .headerBtns { flex-direction: row; }
  }
`;

createRoot(document.getElementById("root")).render(<App />);
