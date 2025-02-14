"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/lib/api/root";
import { ExpenseCategory } from "@prisma/client";
import { Plus, Filter, X } from "lucide-react";

interface ExpenseListProps {
  propertyId: string;
}

export function ExpenseList({ propertyId }: ExpenseListProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    date: "",
    description: "",
    vendor: "",
    notes: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data, refetch } = api.expense.list.useQuery({
    propertyId,
    category: selectedCategory,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    minAmount: minAmount ? parseFloat(minAmount) : undefined,
    maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
  });

  const createMutation = api.expense.create.useMutation({
    onSuccess: () => {
      toast.success("Expense added successfully!");
      setIsAddingExpense(false);
      setNewExpense({
        category: "",
        amount: "",
        date: "",
        description: "",
        vendor: "",
        notes: "",
      });
      refetch();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = api.expense.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully!");
      refetch();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(error.message);
    },
  });

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteMutation.mutateAsync({ id });
      } catch (error) {
        console.error("Failed to delete expense:", error);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/receipt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload receipt");
      }

      const { url, extractedData } = await response.json();

      if (extractedData.amount) {
        setNewExpense((prev) => ({ ...prev, amount: extractedData.amount }));
      }
      if (extractedData.date) {
        setNewExpense((prev) => ({ ...prev, date: extractedData.date }));
      }

      await createMutation.mutateAsync({
        propertyId,
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: new Date(newExpense.date),
        category: newExpense.category as ExpenseCategory,
        receiptUrl: url,
      });

      toast.success("Receipt uploaded and expense created successfully!");
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        propertyId,
        category: newExpense.category as ExpenseCategory,
        amount: parseFloat(newExpense.amount),
        date: new Date(newExpense.date),
        description: newExpense.description || undefined,
        vendor: newExpense.vendor || undefined,
        notes: newExpense.notes || undefined,
      });
    } catch (error) {
      console.error("Failed to create expense:", error);
    }
  };

  const categoryOptions = Object.values(ExpenseCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          <button
            onClick={() => setIsAddingExpense(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-lg border bg-white p-4 shadow">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory || ""}
                onChange={(e) => setSelectedCategory(e.target.value ? (e.target.value as ExpenseCategory) : undefined)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <option value="">All Categories</option>
                {categoryOptions.map((category) => (
                  <option
                    key={category}
                    value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount Range</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingExpense && (
        <div className="relative rounded-lg border bg-white p-6 shadow">
          <button
            onClick={() => setIsAddingExpense(false)}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
          <h3 className="mb-4 text-lg font-medium">Add New Expense</h3>
          <form
            onSubmit={handleSubmit}
            className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  required
                  value={newExpense.category}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, category: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="">Select Category</option>
                  {categoryOptions.map((category) => (
                    <option
                      key={category}
                      value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  required
                  value={newExpense.date}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, date: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor</label>
                <input
                  type="text"
                  value={newExpense.vendor}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, vendor: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Receipt</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="mt-1 block w-full rounded-lg border border-gray-300 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-sm text-gray-500">Upload a receipt image for automatic data extraction</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {isUploading ? "Uploading..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}

      {data?.summary && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-lg font-medium text-gray-900">Summary</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">Rp {data.summary.total.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Categories</p>
              <div className="mt-2 space-y-1 text-sm">
                {Object.entries(data.summary.byCategory).map(([category, amount]) => (
                  <div
                    key={category}
                    className="flex justify-between">
                    <span className="capitalize text-gray-700">{category.toLowerCase()}</span>
                    <span className="font-medium text-gray-900">Rp {amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.expenses.map((expense) => (
              <tr
                key={expense.id}
                className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                    {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">Rp {expense.amount.toLocaleString()}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{expense.vendor || "-"}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{expense.description || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
