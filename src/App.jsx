import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [clientes, setClientes] = useState(() => {
    return JSON.parse(localStorage.getItem("clientesPrestamos") || "[]");
  });

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
      currency: "DOP"
    }).format(valor || 0);

  const diasEntre = (f1, f2) => {
    const d1 = new Date(f1 + "T00:00:00");
    const d2 = new Date(f2 + "T00:00:00");
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  const fechaCuota = (inicio, num) => {
    const f = new Date(inicio + "T00:00:00");
    f.setDate(f.getDate() + num * 7);
    return f.toISOString().slice(0, 10);
  };

  const calcularMora = (cliente) => {
    const hoy = new Date().toISOString().slice(0, 10);
    const pagado = cliente.pagado * cliente.pagoSemanal;
    const saldoPendiente = Math.max(cliente.total - pagado, 0);

    let moraTotal = 0;
    let diasTotal = 0;
    let cuotasAtrasadas = 0;

    for (let i = cliente.pagado + 1; i <= cliente.cuotas; i++) {
      const vencimiento = fechaCuota(cliente.fechaInicio, i);
      const dias = diasEntre(vencimiento, hoy);

      if (dias > 0 && saldoPendiente > 0) {
        cuotasAtrasadas += 1;
        diasTotal += dias;
        moraTotal += dias * (saldoPendiente * (cliente.mora / 100));
      }
    }

    return { moraTotal, diasTotal, cuotasAtrasadas, saldoPendiente };
  };

  const guardar = () => {
    if (!form.nombre || !form.telefono || !form.monto || !form.cuotas) {
      alert("Completa nombre, teléfono, monto y cuotas.");
      return;
    }

    const monto = Number(form.monto);
    const cuotas = Number(form.cuotas);
    const ganancia = Number(form.ganancia);
    const mora = Number(form.mora);
    const total = monto * (1 + ganancia / 100);
    const pagoSemanal = total / cuotas;

    const nuevo = {
      id: Date.now(),
      nombre: form.nombre,
      telefono: form.telefono,
      monto,
      cuotas,
      ganancia,
      mora,
      fechaInicio: form.fechaInicio,
      total,
      pagoSemanal,
      pagado: 0
    };

    setClientes([nuevo, ...clientes]);
    setForm({
      nombre: "",
      telefono: "",
      monto: "",
      cuotas: 15,
      ganancia: 60,
      mora: 1,
      fechaInicio: new Date().toISOString().slice(0, 10)
    });
  };

  const pagar = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.min(c.pagado + 1, c.cuotas) } : c
    ));
  };

  const quitarPago = (id) => {
    setClientes(clientes.map(c =>
      c.id === id ? { ...c, pagado: Math.max(c.pagado - 1, 0) } : c
    ));
  };

  const eliminar = (id) => {
    if (confirm("¿Seguro que deseas eliminar este préstamo?")) {
      setClientes(clientes.filter(c => c.id !== id));
    }
  };

  const whatsapp = (cliente) => {
    const data = calcularMora(cliente);
    const pagado = cliente.pagado * cliente.pagoSemanal;
    const pendiente = data.saldoPendiente + data.moraTotal;
    let tel = cliente.telefono.replace(/\D/g, "");
    if (tel.length === 10 && !tel.startsWith("1")) tel = "1" + tel;

    const mensaje = encodeURIComponent(
      `Hola ${cliente.nombre}, su cuota semanal es de ${dinero(cliente.pagoSemanal)}. Balance pendiente: ${dinero(pendiente)}. Mora actual: ${dinero(data.moraTotal)}.`
    );
    window.open(`https://wa.me/${tel}?text=${mensaje}`, "_blank");
  };

  const resumen = clientes.reduce((acc, c) => {
    const data = calcularMora(c);
    const pagado = c.pagado * c.pagoSemanal;
    acc.prestado += c.monto;
    acc.cobrar += c.total + data.moraTotal;
    acc.pagado += pagado;
    acc.pendiente += data.saldoPendiente + data.moraTotal;
    acc.mora += data.moraTotal;
    acc.atrasados += data.cuotasAtrasadas > 0 ? 1 : 0;
    return acc;
  }, { prestado: 0, cobrar: 0, pagado: 0, pendiente: 0, mora: 0, atrasados: 0 });

  return (
    <div style={{ padding: 16, fontFamily: "Arial", background: "#f1f5f9", minHeight: "100vh" }}>
      <div style={{ background: "#7f1d1d", color: "white", padding: 20, borderRadius: 20 }}>
        <h1>Préstamo Fácil PRO</h1>
        <p>Cuotas semanales con mora automática sobre saldo pendiente.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 15 }}>
        <Box titulo="Clientes" valor={clientes.length} />
        <Box titulo="Prestado" valor={dinero(resumen.prestado)} />
        <Box titulo="Pagado" valor={dinero(resumen.pagado)} />
        <Box titulo="Pendiente" valor={dinero(resumen.pendiente)} />
        <Box titulo="Mora" valor={dinero(resumen.mora)} />
        <Box titulo="Atrasados" valor={resumen.atrasados} />
      </div>

      <div className="card">
        <h2>Nuevo préstamo</h2>

        <label>Nombre del cliente</label>
        <input placeholder="Ej: Juan Pérez" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

        <label>Teléfono</label>
        <input placeholder="Ej: 8091234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />

        <label>Monto prestado</label>
        <input placeholder="Ej: 10000" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />

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
          <p>Pago semanal: <b>{dinero((Number(form.monto || 0) * (1 + Number(form.ganancia || 0) / 100)) / Number(form.cuotas || 1))}</b></p>
        </div>

        <button onClick={guardar}>Guardar préstamo</button>
      </div>

      {clientes.map(c => {
        const data = calcularMora(c);
        const pagado = c.pagado * c.pagoSemanal;
        const pendiente = data.saldoPendiente + data.moraTotal;
        const proximaCuota = c.pagado < c.cuotas ? c.pagado + 1 : c.cuotas;
        const fechaProxima = c.pagado < c.cuotas ? fechaCuota(c.fechaInicio, proximaCuota) : "Saldado";

        return (
          <div key={c.id} className="card">
            <h2>{c.nombre}</h2>
            <p>📞 {c.telefono}</p>
            <p>Estado: <b style={{ color: data.cuotasAtrasadas > 0 ? "#dc2626" : "#16a34a" }}>{data.cuotasAtrasadas > 0 ? "Atrasado" : "Al día"}</b></p>
            <p>Monto prestado: <b>{dinero(c.monto)}</b></p>
            <p>Total sin mora: <b>{dinero(c.total)}</b></p>
            <p>Pago semanal: <b>{dinero(c.pagoSemanal)}</b></p>
            <p>Cuotas pagadas: <b>{c.pagado} / {c.cuotas}</b></p>
            <p>Próxima cuota: <b>{fechaProxima}</b></p>
            <p>Saldo pendiente sin mora: <b>{dinero(data.saldoPendiente)}</b></p>
            <p>Días atrasados acumulados: <b>{data.diasTotal}</b></p>
            <p>Mora diaria: <b>{c.mora}% del saldo pendiente</b></p>
            <p>Mora acumulada: <b>{dinero(data.moraTotal)}</b></p>
            <p>Total pendiente: <b>{dinero(pendiente)}</b></p>

            <button onClick={() => pagar(c.id)}>Marcar cuota pagada</button>
            <button onClick={() => quitarPago(c.id)} style={{ background: "#475569" }}>Quitar último pago</button>
            <button onClick={() => whatsapp(c)} style={{ background: "#16a34a" }}>Cobrar por WhatsApp</button>
            <button onClick={() => eliminar(c.id)} style={{ background: "#dc2626" }}>Eliminar</button>
          </div>
        );
      })}

      <style>{`
        .card {
          background: white;
          padding: 16px;
          border-radius: 20px;
          margin-top: 15px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .preview {
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          margin-top: 10px;
        }
        input {
          width: 100%;
          padding: 12px;
          margin: 6px 0 12px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          font-size: 16px;
        }
        label {
          font-size: 13px;
          font-weight: bold;
          color: #334155;
        }
        button {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          border: none;
          border-radius: 12px;
          background: #7f1d1d;
          color: white;
          font-weight: bold;
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}

function Box({ titulo, valor }) {
  return (
    <div style={{ background: "white", padding: 14, borderRadius: 16 }}>
      <small>{titulo}</small>
      <h3>{valor}</h3>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
