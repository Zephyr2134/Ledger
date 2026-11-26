"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

type Expense = { label: string; cost: number; color: string};

export default function BudgetDonut()
{
    const [expenses, setExpenses] = useState<Expense[]>([
        {
            label: "Direct",
            cost: 45,
            color: "#3b82f6"
        },
        {
            label: "Organic Search",
            cost: 30,
            color: "#000000"
        },
        {
            label: "Referral",
            cost: 15,
            color: "#f59e0b"
        },
        {
            label: "Social",
            cost: 10,
            color: "#ef4444"
        }
    ]);

    const data = {
    labels: expenses.map(e => e.label),
    datasets: [
      {
        label: "Traffic Sources",
        data: expenses.map(e => e.cost),
        backgroundColor: expenses.map(e => e.color),
        borderColor: "#ffffff",
        borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
        legend: {
            position: "bottom" as const,
            },
        },
    };

    const [newLabel, setNewLabel] = useState("");
    const [newCost, setNewCost] = useState(0);
    const [newColor, setNewColor] = useState("");

    const handleSubmit = (e: React.SubmitEvent) =>{
        e.preventDefault();
        setExpenses(prev => [...prev, {label: newLabel, cost: newCost, color: newColor}]);
        setNewLabel("");
        setNewColor("");
        setNewCost(0);
    }
    return (
            <div className="relative h-72 w-full max-w-md mx-auto">
                <Doughnut data={data} options={options} />

                <form className="flex flex-row" onSubmit={handleSubmit}>
                    <input onChange={e => setNewLabel(e.currentTarget.value)} value={newLabel} type="text" placeholder="New Expense" />
                    <input onChange={e => setNewColor(e.currentTarget.value)} value={newColor} type="text" placeholder="New Color" />
                    <input type="number" onChange={e => setNewCost(Number(e.target.value))} value={newCost} placeholder="0" />
                    <button type="submit">Add Expense</button>
                </form>

                <div>
                    {expenses.map((e, i) => 
                        <div className="flex flex-row justify-between" key={i}>
                            <h2>{e.label}</h2>
                            <h2>{e.cost}$</h2>
                        </div>
                    )}
                </div>
            </div>
    )
}