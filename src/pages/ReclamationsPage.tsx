import { useState } from 'react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronRight,
    Search,
    FileWarning,
    TrendingUp,
    Loader2,
    Package,
    Building2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import MainContent from '@/components/layout/MainContent';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    useRestaurantReportsList,
    useRestaurantReportDetails,
    useRestaurantReportStats,
    type ReportStatus,
} from '@/hooks/useRestaurantReports';
import { cn } from '@/lib/utils';

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
    pending: {
        label: 'Pending',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        icon: <Clock className="w-4 h-4" />,
    },
    acknowledged: {
        label: 'Acknowledged',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        icon: <CheckCircle2 className="w-4 h-4" />,
    },
    resolved: {
        label: 'Resolved',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
        icon: <CheckCircle2 className="w-4 h-4" />,
    },
    disputed: {
        label: 'Disputed',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        icon: <XCircle className="w-4 h-4" />,
    },
};

export default function ReclamationsPage() {
    const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    const { data: reports, isLoading } = useRestaurantReportsList({ status: statusFilter });
    const { data: stats } = useRestaurantReportStats();
    const { data: selectedReport, isLoading: isLoadingDetails } = useRestaurantReportDetails(selectedReportId || undefined);

    // Filter reports by search query
    const filteredReports = (reports || []).filter(report =>
        report.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const StatusBadge = ({ status }: { status: ReportStatus }) => {
        const config = statusConfig[status];
        return (
            <Badge variant="outline" className={cn('gap-1.5', config.color, config.bgColor, 'border-0')}>
                {config.icon}
                {config.label}
            </Badge>
        );
    };

    return (
        <AppLayout>
            <MainContent>
                <div className="max-w-6xl mx-auto pb-20">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <FileWarning className="w-7 h-7 text-[#009DE0]" />
                            Reclamations
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Track and manage your missing items reports to suppliers
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Pending
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    In Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats?.acknowledged || 0}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    Resolved
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{stats?.resolved || 0}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-[#009DE0]" />
                                    Recovered
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-[#009DE0]">
                                    {stats?.recoveredValue?.toFixed(2) || '0.00'}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                                placeholder="Search by supplier..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 bg-card"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
                            className="h-11 px-4 rounded-lg border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-[#009DE0]/20 font-medium"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="resolved">Resolved</option>
                            <option value="disputed">Disputed</option>
                        </select>
                    </div>

                    {/* Reports List */}
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-[#009DE0]" />
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center py-20">
                            <FileWarning className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">No reclamations found</p>
                            <p className="text-muted-foreground text-sm mt-2">
                                When you report missing items from a delivery, they will appear here
                            </p>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead className="text-center">Items</TableHead>
                                        <TableHead className="text-right">Missing Value</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReports.map((report) => (
                                        <TableRow
                                            key={report.id}
                                            className="cursor-pointer hover:bg-muted/20 transition-colors"
                                            onClick={() => setSelectedReportId(report.id)}
                                        >
                                            <TableCell className="font-medium">
                                                {format(new Date(report.created_at), 'MMM d, yyyy')}
                                                <div className="text-xs text-muted-foreground">
                                                    {format(new Date(report.created_at), 'HH:mm')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    {report.supplier?.name || 'Unknown Supplier'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary">{report.items_count || 0}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-red-600">
                                                {Number(report.total_missing_value || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StatusBadge status={report.status} />
                                            </TableCell>
                                            <TableCell>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Report Details Dialog */}
                    <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            {isLoadingDetails ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#009DE0]" />
                                </div>
                            ) : selectedReport ? (
                                <>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <FileWarning className="w-5 h-5 text-[#009DE0]" />
                                            Reclamation Details
                                        </DialogTitle>
                                        <DialogDescription>
                                            Submitted on {format(new Date(selectedReport.created_at), 'MMMM d, yyyy \'at\' HH:mm')}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-6 mt-4">
                                        {/* Status and Supplier */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Building2 className="w-5 h-5 text-muted-foreground" />
                                                <div>
                                                    <p className="font-semibold">{selectedReport.supplier?.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedReport.supplier?.contact_email}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge status={selectedReport.status} />
                                        </div>

                                        {/* Timeline */}
                                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                            <h4 className="font-medium text-sm text-muted-foreground">Timeline</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-[#009DE0]" />
                                                    <span>Submitted: {format(new Date(selectedReport.created_at), 'MMM d, yyyy HH:mm')}</span>
                                                </div>
                                                {selectedReport.acknowledged_at && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <span>Acknowledged: {format(new Date(selectedReport.acknowledged_at), 'MMM d, yyyy HH:mm')}</span>
                                                    </div>
                                                )}
                                                {selectedReport.resolved_at && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span>Resolved: {format(new Date(selectedReport.resolved_at), 'MMM d, yyyy HH:mm')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolution Notes */}
                                        {selectedReport.notes && (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
                                                <h4 className="font-medium text-sm text-emerald-700 dark:text-emerald-400 mb-2">
                                                    Supplier Response
                                                </h4>
                                                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                                                    {selectedReport.notes}
                                                </p>
                                            </div>
                                        )}

                                        {/* Missing Items */}
                                        <div>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                Missing Items ({selectedReport.items?.length || 0})
                                            </h4>
                                            {selectedReport.items && selectedReport.items.length > 0 ? (
                                                <div className="border rounded-lg overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30">
                                                                <TableHead>Item</TableHead>
                                                                <TableHead className="text-center">Expected</TableHead>
                                                                <TableHead className="text-center">Received</TableHead>
                                                                <TableHead className="text-center text-red-600">Missing</TableHead>
                                                                <TableHead className="text-right">Value</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {selectedReport.items.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                                                    <TableCell className="text-center">
                                                                        {item.expected_quantity} {item.unit || ''}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {item.received_quantity} {item.unit || ''}
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-red-600 font-semibold">
                                                                        {item.missing_quantity} {item.unit || ''}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-red-600">
                                                                        {Number(item.total_missing_value || 0).toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No item details available</p>
                                            )}
                                        </div>

                                        {/* Total */}
                                        <div className="flex justify-between items-center pt-4 border-t">
                                            <span className="font-semibold">Total Missing Value</span>
                                            <span className="text-xl font-bold text-red-600">
                                                {Number(selectedReport.total_missing_value || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </DialogContent>
                    </Dialog>
                </div>
            </MainContent>
        </AppLayout>
    );
}
