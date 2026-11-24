"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Pagination,
  PasswordInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

type User = { id: string; email: string; role: string };
type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
type ReferenceItem = { id: string; name?: string; title?: string };
type CurrencyItem = { id: string; code: string; name: string; symbol: string };
type SalaryRevision = {
  id?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  baseSalary: string | number;
  grossSalary?: string | number;
  netSalary?: string | number;
  currency: { code: string; symbol: string };
  components?: { id?: string; name: string; type: string; amount: string | number }[];
};
type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: EmployeeStatus;
  country: { name: string };
  department: { name: string };
  designation: { title: string };
  salary: { revisions: SalaryRevision[] } | null;
};
type PageData = {
  items: Employee[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
type AnalyticsGroup = {
  group_name: string;
  currency_code: string;
  currency_symbol: string;
  employee_count: number;
  average_gross: string | number | null;
  minimum_gross: string | number | null;
  maximum_gross: string | number | null;
};
type AnalyticsOverview = {
  employeeCount: number;
  activeEmployeeCount: number;
  byCurrency: AnalyticsGroup[];
  byCountry: AnalyticsGroup[];
  byDepartment: AnalyticsGroup[];
};
type DistributionItem = {
  range_label: string;
  currency_code: string;
  currency_symbol: string;
  employee_count: number;
};
type TrendItem = {
  month: string;
  currency_code: string;
  currency_symbol: string;
  employee_count: number;
  average_gross: string | number | null;
};

const statuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "TERMINATED", label: "Terminated" },
];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  }
  return payload as T;
}

function statusColor(status: EmployeeStatus) {
  if (status === "ACTIVE") return "teal";
  if (status === "ON_LEAVE") return "yellow";
  if (status === "INACTIVE") return "gray";
  return "red";
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<PageData["pagination"]>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [countryId, setCountryId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [designationId, setDesignationId] = useState<string | null>(null);
  const [countries, setCountries] = useState<ReferenceItem[]>([]);
  const [departments, setDepartments] = useState<ReferenceItem[]>([]);
  const [designations, setDesignations] = useState<ReferenceItem[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [salaryEmployee, setSalaryEmployee] = useState<Employee | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryRevision[]>([]);
  const [salaryForm, setSalaryForm] = useState({
    baseSalary: "",
    currencyId: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    allowance: "",
    bonus: "",
    deduction: "",
  });
  const [salaryBusy, setSalaryBusy] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    email: "",
    countryId: "",
    departmentId: "",
    designationId: "",
  });

  useEffect(() => {
    request<{ data: { user: User } }>("/auth/me")
      .then((result) => setUser(result.data.user))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    const query = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      sortBy: "employeeCode",
      sortOrder: "asc",
    });
    if (search.trim()) query.set("search", search.trim());
    if (status) query.set("status", status);
    if (countryId) query.set("countryId", countryId);
    if (departmentId) query.set("departmentId", departmentId);
    if (designationId) query.set("designationId", designationId);

    request<{ data: PageData }>(`/employees?${query}`)
      .then((result) => {
        if (!cancelled) {
          setEmployees(result.data.items);
          setPagination(result.data.pagination);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load employees");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, page, search, status, countryId, departmentId, designationId, refreshKey]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      request<{ data: { countries: ReferenceItem[] } }>("/countries"),
      request<{ data: { departments: ReferenceItem[] } }>("/departments"),
      request<{ data: { designations: ReferenceItem[] } }>("/designations"),
      request<{ data: { currencies: CurrencyItem[] } }>("/currencies"),
      request<{ data: AnalyticsOverview }>("/analytics/overview"),
      request<{ data: { items: DistributionItem[] } }>("/analytics/distribution"),
      request<{ data: { items: TrendItem[] } }>("/analytics/trends"),
    ])
      .then(([countryResult, departmentResult, designationResult, currencyResult, analyticsResult, distributionResult, trendResult]) => {
        setCountries(countryResult.data.countries);
        setDepartments(departmentResult.data.departments);
        setDesignations(designationResult.data.designations);
        setCurrencies(currencyResult.data.currencies);
        setAnalytics(analyticsResult.data);
        setDistribution(distributionResult.data.items);
        setTrends(trendResult.data.items);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load reference data");
      });
  }, [user]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request<{ data: { user: User } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(result.data.user);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setEmployees([]);
  }

  async function handleStatusChange(employee: Employee, nextStatus: string | null) {
    if (!nextStatus || nextStatus === employee.status) return;
    setUpdatingStatusId(employee.id);
    setError("");
    try {
      await request(`/employees/${employee.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change employee status");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function openCreateEmployee() {
    setEditingEmployeeId(null);
    setForm({
      employeeCode: "",
      firstName: "",
      lastName: "",
      email: "",
      countryId: "",
      departmentId: "",
      designationId: "",
    });
    setCreateOpen(true);
  }

  function openEditEmployee(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setForm({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      countryId: countries.find((item) => item.name === employee.country.name)?.id ?? "",
      departmentId: departments.find((item) => item.name === employee.department.name)?.id ?? "",
      designationId: designations.find((item) => item.title === employee.designation.title)?.id ?? "",
    });
    setCreateOpen(true);
  }

  async function handleCreateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request(editingEmployeeId ? `/employees/${editingEmployeeId}` : "/employees", {
        method: editingEmployeeId ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      setCreateOpen(false);
      setForm({
        employeeCode: "",
        firstName: "",
        lastName: "",
        email: "",
        countryId: "",
        departmentId: "",
        designationId: "",
      });
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create employee");
    } finally {
      setSaving(false);
    }
  }

  async function openSalary(employee: Employee) {
    setSalaryEmployee(employee);
    setSalaryHistory([]);
    setError("");
    setSalaryForm({
      baseSalary: "",
      currencyId: currencies.find((currency) => currency.code === employee.salary?.revisions[0]?.currency.code)?.id ?? currencies[0]?.id ?? "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      allowance: "",
      bonus: "",
      deduction: "",
    });
    try {
      const result = await request<{ data: { revisions: SalaryRevision[] } }>(
        `/employees/${employee.id}/salary/history`
      );
      setSalaryHistory(result.data.revisions);
    } catch {
      // A new employee has no salary history yet.
    }
  }

  async function handleSaveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!salaryEmployee) return;
    setSalaryBusy(true);
    setError("");
    const components = [
      { name: "Allowance", type: "ALLOWANCE", amount: salaryForm.allowance },
      { name: "Bonus", type: "BONUS", amount: salaryForm.bonus },
      { name: "Deduction", type: "DEDUCTION", amount: salaryForm.deduction },
    ].filter((component) => component.amount && Number(component.amount) > 0);
    const hasSalary = salaryHistory.length > 0 || Boolean(salaryEmployee.salary);
    try {
      await request(
        `/employees/${salaryEmployee.id}/salary${hasSalary ? "/revisions" : ""}`,
        {
          method: "POST",
          body: JSON.stringify({
            currencyId: salaryForm.currencyId,
            baseSalary: salaryForm.baseSalary,
            effectiveFrom: salaryForm.effectiveFrom,
            components,
          }),
        }
      );
      const result = await request<{ data: { revisions: SalaryRevision[] } }>(
        `/employees/${salaryEmployee.id}/salary/history`
      );
      setSalaryHistory(result.data.revisions);
      setSalaryForm({ ...salaryForm, baseSalary: "", allowance: "", bonus: "", deduction: "" });
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save salary");
    } finally {
      setSalaryBusy(false);
    }
  }

  const title = user ? "Employee directory" : "Sign in to ACME";

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">AC</span>
          <span>ACME <span style={{ color: "var(--muted)", fontWeight: 500 }}>Compensation</span></span>
        </div>
        <div className="topbar-note">People operations · Secure HR workspace</div>
        {user && <Button variant="subtle" color="dark" onClick={handleLogout}>Sign out</Button>}
      </header>

      {checkingSession ? (
        <div className="login-wrap"><Loader color="teal" /></div>
      ) : !user ? (
        <main className="login-wrap">
          <section className="login-card">
            <span className="eyebrow">HR workspace</span>
            <h1>{title}</h1>
            <p>Sign in to securely manage employee compensation.</p>
            {error && <Alert color="red" className="error-banner">{error}</Alert>}
            <form onSubmit={handleLogin} className="login-fields">
              <TextInput label="Work email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
              <PasswordInput label="Password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
              <Button type="submit" color="teal" fullWidth loading={busy} mt="sm">Sign in</Button>
            </form>
            <div className="login-footnote">Access is restricted to authorized HR managers. Account access is provisioned by your ACME administrator.</div>
          </section>
        </main>
      ) : (
        <main className="content">
          <div className="heading-row">
            <div>
              <span className="eyebrow">People · Overview</span>
              <h1>{title}</h1>
              <p>Search and manage employee records across ACME.</p>
            </div>
            <Button color="teal" onClick={openCreateEmployee}>Add employee</Button>
          </div>

          <section className="analytics-section">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Compensation · Overview</span>
                <h2>How ACME pays</h2>
              </div>
              <span className="analytics-caption">Amounts stay grouped by currency</span>
            </div>
            <div className="metrics-grid">
              <article className="metric-card">
                <span className="metric-label">Total employees</span>
                <strong>{analytics?.employeeCount.toLocaleString() ?? "—"}</strong>
                <span className="metric-note">Across all locations</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">Active employees</span>
                <strong>{analytics?.activeEmployeeCount.toLocaleString() ?? "—"}</strong>
                <span className="metric-note">Current workforce</span>
              </article>
              {analytics?.byCurrency.map((group) => (
                <article className="metric-card" key={group.currency_code}>
                  <span className="metric-label">Average gross · {group.currency_code}</span>
                  <strong>{group.currency_symbol}{Number(group.average_gross ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  <span className="metric-note">{group.employee_count.toLocaleString()} employees · min {group.currency_symbol}{Number(group.minimum_gross ?? 0).toLocaleString()} · max {group.currency_symbol}{Number(group.maximum_gross ?? 0).toLocaleString()}</span>
                </article>
              ))}
            </div>
            {analytics && analytics.byDepartment.length > 0 && (
              <section className="insight-card">
                <div className="section-title-row compact">
                  <div><h3>Average gross by department</h3><span className="metric-note">Each row shows one department and currency pair.</span></div>
                </div>
                <div className="department-grid">
                  {analytics.byDepartment.map((group) => (
                    <div className="department-row" key={`${group.group_name}-${group.currency_code}`}>
                      <span className="department-name">{group.group_name}</span>
                      <span className="subtle">{group.employee_count} employees · {group.currency_code}</span>
                      <strong>{group.currency_symbol}{Number(group.average_gross ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {analytics && analytics.byCountry.length > 0 && (
              <section className="insight-card">
                <div className="section-title-row compact"><div><h3>Average gross by country</h3><span className="metric-note">Currency-specific comparisons.</span></div></div>
                <div className="department-grid">
                  {analytics.byCountry.map((group) => (
                    <div className="department-row" key={`${group.group_name}-${group.currency_code}`}>
                      <span className="department-name">{group.group_name}</span>
                      <span className="subtle">{group.employee_count} employees · {group.currency_code}</span>
                      <strong>{group.currency_symbol}{Number(group.average_gross ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {distribution.length > 0 && (
              <section className="insight-card">
                <div className="section-title-row compact"><div><h3>Active employee salary distribution</h3><span className="metric-note">Gross salary ranges are displayed separately by currency.</span></div></div>
                <div className="distribution-grid">
                  {distribution.map((item) => {
                    const max = Math.max(...distribution.filter((other) => other.currency_code === item.currency_code).map((other) => other.employee_count), 1);
                    return (
                      <div className="distribution-row" key={`${item.currency_code}-${item.range_label}`}>
                        <span>{item.range_label} · {item.currency_code}</span>
                        <div className="distribution-track"><span style={{ width: `${Math.max(4, (item.employee_count / max) * 100)}%` }} /></div>
                        <strong>{item.employee_count}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {trends.length > 0 && (
              <section className="insight-card">
                <div className="section-title-row compact"><div><h3>Monthly gross salary trend</h3><span className="metric-note">Average gross salary at month end, grouped by currency.</span></div></div>
                <div className="trend-grid">
                  {trends.slice(-16).map((item) => (
                    <div className="trend-row" key={`${item.month}-${item.currency_code}`}>
                      <span>{item.month}</span>
                      <span>{item.currency_code} · {item.employee_count} active employees</span>
                      <strong>{item.currency_symbol}{Number(item.average_gross ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          {error && <Alert color="red" className="error-banner" withCloseButton onClose={() => setError("")}>{error}</Alert>}

          <div className="toolbar">
            <TextInput className="toolbar-search" label="Search employees" placeholder="Name, employee code, or email" value={search} onChange={(event) => { setPage(1); setSearch(event.currentTarget.value); }} />
            <Select label="Status" placeholder="All statuses" clearable data={statuses} value={status} onChange={(value) => { setPage(1); setStatus(value); }} w={180} />
            <Select label="Country" placeholder="All countries" searchable clearable data={countries.map((item) => ({ value: item.id, label: item.name ?? "" }))} value={countryId} onChange={(value) => { setPage(1); setCountryId(value); }} w={180} />
            <Select label="Department" placeholder="All departments" searchable clearable data={departments.map((item) => ({ value: item.id, label: item.name ?? "" }))} value={departmentId} onChange={(value) => { setPage(1); setDepartmentId(value); }} w={180} />
            <Select label="Designation" placeholder="All designations" searchable clearable data={designations.map((item) => ({ value: item.id, label: item.title ?? "" }))} value={designationId} onChange={(value) => { setPage(1); setDesignationId(value); }} w={180} />
            <div style={{ color: "var(--muted)", fontSize: 13, padding: "0 4px 9px" }}>{pagination.total.toLocaleString()} employees</div>
          </div>

          <section className="table-card" aria-label="Employee results">
            <div className="table-scroll">
              <Table className="employee-table" verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Organization</Table.Th>
                    <Table.Th>Country</Table.Th>
                    <Table.Th>Current base salary</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {busy ? (
                    <Table.Tr><Table.Td colSpan={6}><div className="empty-state"><Loader size="sm" color="teal" /></div></Table.Td></Table.Tr>
                  ) : employees.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={6}><div className="empty-state"><strong>No employees found</strong>Try another search or add an employee record.</div></Table.Td></Table.Tr>
                  ) : employees.map((employee) => {
                    const revision = employee.salary?.revisions[0];
                    return (
                      <Table.Tr key={employee.id}>
                        <Table.Td>
                          <span className="person-name">{employee.firstName} {employee.lastName}</span>
                          <span className="subtle">{employee.employeeCode} · {employee.email}</span>
                        </Table.Td>
                        <Table.Td>
                          <span>{employee.department.name}</span>
                          <span className="subtle">{employee.designation.title}</span>
                        </Table.Td>
                        <Table.Td>{employee.country.name}</Table.Td>
                        <Table.Td>{revision ? `${revision.currency.symbol}${Number(revision.baseSalary).toLocaleString()} ${revision.currency.code}` : <span className="subtle">Not set</span>}</Table.Td>
                        <Table.Td><Badge color={statusColor(employee.status)} variant="light">{employee.status.replace("_", " ")}</Badge></Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Button size="xs" variant="subtle" color="blue" onClick={() => void openSalary(employee)}>Salary</Button>
                            <Button size="xs" variant="subtle" color="teal" onClick={() => openEditEmployee(employee)}>Edit</Button>
                            <Select
                              aria-label={`Change ${employee.employeeCode} status`}
                              data={statuses}
                              value={employee.status}
                              onChange={(value) => void handleStatusChange(employee, value)}
                              disabled={updatingStatusId === employee.id}
                              size="xs"
                              w={135}
                            />
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
            <div className="table-footer">
              <Text size="sm" c="dimmed">Page {pagination.page} of {Math.max(1, pagination.totalPages)}</Text>
              <Pagination total={Math.max(1, pagination.totalPages)} value={page} onChange={setPage} color="teal" size="sm" withControls />
            </div>
          </section>
        </main>
      )}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title={editingEmployeeId ? "Edit employee" : "Add employee"} centered>
        <form onSubmit={handleCreateEmployee}>
          <Stack gap="sm">
            <TextInput label="Employee code" required value={form.employeeCode} onChange={(event) => setForm({ ...form, employeeCode: event.currentTarget.value })} />
            <Group grow>
              <TextInput label="First name" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.currentTarget.value })} />
              <TextInput label="Last name" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.currentTarget.value })} />
            </Group>
            <TextInput label="Work email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.currentTarget.value })} />
            <Select label="Country" required data={countries.map((item) => ({ value: item.id, label: item.name ?? "" }))} value={form.countryId || null} onChange={(value) => setForm({ ...form, countryId: value ?? "" })} />
            <Select label="Department" required data={departments.map((item) => ({ value: item.id, label: item.name ?? "" }))} value={form.departmentId || null} onChange={(value) => setForm({ ...form, departmentId: value ?? "" })} />
            <Select label="Designation" required data={designations.map((item) => ({ value: item.id, label: item.title ?? "" }))} value={form.designationId || null} onChange={(value) => setForm({ ...form, designationId: value ?? "" })} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" color="teal" loading={saving}>{editingEmployeeId ? "Save changes" : "Create employee"}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={salaryEmployee !== null}
        onClose={() => setSalaryEmployee(null)}
        title={salaryEmployee ? `Salary · ${salaryEmployee.firstName} ${salaryEmployee.lastName}` : "Salary"}
        centered
        size="lg"
      >
        <Stack gap="md">
          <div>
            <Text fw={650} mb="xs">Salary history</Text>
            {salaryHistory.length === 0 ? (
              <Text size="sm" c="dimmed">No salary package has been recorded.</Text>
            ) : (
              <Stack gap="xs">
                {salaryHistory.map((revision) => (
                  <Group key={revision.id ?? revision.effectiveFrom} justify="space-between" className="history-row">
                    <div>
                      <Text size="sm" fw={600}>{revision.effectiveFrom?.slice(0, 10) ?? "Effective date"}</Text>
                      <Text size="xs" c="dimmed">Gross {revision.currency.symbol}{Number(revision.grossSalary ?? revision.baseSalary).toLocaleString()} · Net {revision.currency.symbol}{Number(revision.netSalary ?? revision.baseSalary).toLocaleString()}</Text>
                    </div>
                    <Text size="sm">{revision.currency.code}</Text>
                  </Group>
                ))}
              </Stack>
            )}
          </div>
          <form onSubmit={handleSaveSalary}>
            <Stack gap="sm">
              <Text fw={650}>{salaryHistory.length ? "Add a salary revision" : "Record initial salary"}</Text>
              <Group grow>
                <TextInput label="Base salary" type="number" min="0" step="0.0001" required value={salaryForm.baseSalary} onChange={(event) => setSalaryForm({ ...salaryForm, baseSalary: event.currentTarget.value })} />
                <Select label="Currency" required data={currencies.map((currency) => ({ value: currency.id, label: `${currency.code} · ${currency.name}` }))} value={salaryForm.currencyId || null} onChange={(value) => setSalaryForm({ ...salaryForm, currencyId: value ?? "" })} />
              </Group>
              <TextInput label="Effective from" type="date" required value={salaryForm.effectiveFrom} onChange={(event) => setSalaryForm({ ...salaryForm, effectiveFrom: event.currentTarget.value })} />
              <Group grow>
                <TextInput label="Allowance" type="number" min="0" step="0.0001" value={salaryForm.allowance} onChange={(event) => setSalaryForm({ ...salaryForm, allowance: event.currentTarget.value })} />
                <TextInput label="Bonus" type="number" min="0" step="0.0001" value={salaryForm.bonus} onChange={(event) => setSalaryForm({ ...salaryForm, bonus: event.currentTarget.value })} />
                <TextInput label="Deduction" type="number" min="0" step="0.0001" value={salaryForm.deduction} onChange={(event) => setSalaryForm({ ...salaryForm, deduction: event.currentTarget.value })} />
              </Group>
              <Button type="submit" color="teal" loading={salaryBusy}>{salaryHistory.length ? "Save revision" : "Save salary"}</Button>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </div>
  );
}
