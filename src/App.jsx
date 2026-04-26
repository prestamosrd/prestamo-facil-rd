import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [clientes, setClientes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("clientesPrestamos") || "[]");
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

    return {
      pagado,
      saldoSinMora,
      moraDiaria,
      moraTotal,
      pendienteTotal,
      cuotasAtrasadas,
      diasAtrasados,
      proximaCuotaNumero,
      proximaFecha
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
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.min(Number(c.pagado || 0) + 1, Number(c.cuotas || 0)) } : c
    ));
  };

  const quitarPago = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.max(Number(c.pagado || 0) - 1, 0) } : c
    ));
  };

  const eliminar = (id) => {
    if (confirm("¿Seguro que deseas eliminar este préstamo?")) {
      setClientes(clientes.filter(c => c.id !== id));
    }
  };

  const abrirWhatsApp = (telefono, mensaje) => {
    let tel = String(telefono || "").replace(/\D/g, "");
    if (tel.length === 10 && !tel.startsWith("1")) tel = "1" + tel;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const enviarCobro = (cliente) => {
    const data = calcular(cliente);
    const mensaje = `📌 *AVISO DE COBRO*\n\n👤 Cliente: ${cliente.nombre}\n💵 Cuota semanal: ${dinero(cliente.pagoSemanal)}\n📅 Próxima cuota: ${data.proximaFecha}\n⚠️ Mora acumulada: ${dinero(data.moraTotal)}\n📉 Balance pendiente: ${dinero(data.pendienteTotal)}\n\nFavor realizar su pago. Gracias.`;
    abrirWhatsApp(cliente.telefono, mensaje);
  };

  const enviarRecibo = (cliente) => {
    const data = calcular(cliente);
    const mensaje = `🧾 *RECIBO DE PAGO*\n\n👤 Cliente: ${cliente.nombre}\n📞 Teléfono: ${cliente.telefono}\n\n💰 Monto prestado: ${dinero(cliente.monto)}\n📊 Total del préstamo: ${dinero(cliente.total)}\n💵 Valor de cuota: ${dinero(cliente.pagoSemanal)}\n✅ Cuotas pagadas: ${cliente.pagado}/${cliente.cuotas}\n\n⚠️ Mora acumulada: ${dinero(data.moraTotal)}\n📉 Balance pendiente: ${dinero(data.pendienteTotal)}\n\n🙏 Gracias por su pago.`;
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
      return acc;
    }, { prestado: 0, total: 0, pagado: 0, mora: 0, pendiente: 0, atrasados: 0 });
  }, [clientes]);

  return (
    <div className="app">
      <header className="header">
        <h1>Préstamo Fácil PRO</h1>
        <p>Control de préstamos, cuotas, mora automática y WhatsApp.</p>
      </header>

      <section className="grid resumen">
        <Box titulo="Clientes" valor={clientes.length} />
        <Box titulo="Prestado" valor={dinero(resumen.prestado)} />
        <Box titulo="Pagado" valor={dinero(resumen.pagado)} />
        <Box titulo="Mora" valor={dinero(resumen.mora)} />
        <Box titulo="Pendiente" valor={dinero(resumen.pendiente)} />
        <Box titulo="Atrasados" valor={resumen.atrasados} />
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
        const estado = data.pendienteTotal <= 0 ? "Saldado" : data.cuotasAtrasadas > 0 ? "Atrasado" : "Al día";

        return (
          <section key={cliente.id} className="card cliente">
            <div className="clienteTop">
              <div>
                <h2>{cliente.nombre}</h2>
                <p>📞 {cliente.telefono}</p>
              </div>
              <span className={estado === "Atrasado" ? "rojo" : "verde"}>{estado}</span>
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
            <button onClick={() => enviarCobro(cliente)} className="verdeBtn">Cobrar por WhatsApp</button>
            <button onClick={() => enviarRecibo(cliente)} className="azulBtn">Enviar recibo por WhatsApp</button>
            <button onClick={() => eliminar(cliente.id)} className="rojoBtn">Eliminar préstamo</button>
          </section>
        );
      })}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .app { min-height: 100vh; background: #f1f5f9; padding: 16px; font-family: Arial, sans-serif; color: #0f172a; }
        .header { background: linear-gradient(135deg, #7f1d1d, #111827); color: white; padding: 20px; border-radius: 22px; margin-bottom: 14px; }
        .header h1 { margin: 0; font-size: 26px; }
        .header p { margin: 6px 0 0; color: #e5e7eb; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .box, .card { background: white; border-radius: 18px; padding: 14px; box-shadow: 0 1px 5px rgba(0,0,0,.08); }
        .box small { color: #64748b; }
        .box h3 { margin: 5px 0 0; font-size: 17px; }
        .card { margin-top: 14px; }
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
        .verde, .rojo { padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; color: white; }
        .verde { background: #16a34a; }
        .rojo { background: #dc2626; }
        @media (min-width: 700px) {
          .app { max-width: 900px; margin: auto; }
          .grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
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

createRoot(document.getElementById("root")).render(<App />);
