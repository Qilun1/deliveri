import { useState, useMemo, useEffect } from 'react';
import {
    AlertTriangle,
    Search,
    ChevronDown,
    Check,
    X,
    Package,
    Calendar,
    Loader2,
    Mail,
    Phone,
    FileText,
    Clock,
    Bell,
    RefreshCw,
    MessageSquareWarning,
    Inbox,
    Truck,
    Image,
    ExternalLink,
} from 'lucide-react';
import MainContent from '@/components/layout/MainContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from '@/components/ui/table';
import {
    useSupplierReports,
    useSupplierReportsList,
    useSupplierReportDetails,
    useAcknowledgeReport,
    useResolveReport,
    useDisputeReport,
    type MissingItemsReportWithRestaurant,
    type ReportStatus,
    type ResolutionType,
    type DisputeReason,
} from '@/hooks/useSupplierReports';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { OrderResolutionSheet } from '@/components/supplier/OrderResolutionSheet';

type TabValue = 'all' | ReportStatus;

export default function DeliveryIssues() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabValue>('all');
    const [expandedReports, setExpandedReports] = useState<string[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // Dialog states
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
    const [resolutionSheetOpen, setResolutionSheetOpen] = useState(false);
    const [reportForResolution, setReportForResolution] = useState<MissingItemsReportWithRestaurant | null>(null);
    const [resolutionType, setResolutionType] = useState<ResolutionType>('redelivery_scheduled');
    const [resolutionNote, setResolutionNote] = useState('');
    const [disputeReason, setDisputeReason] = useState<DisputeReason>('items_delivered');
    const [disputeDetails, setDisputeDetails] = useState('');

    // Real-time subscription
    const { isConnected, lastEvent } = useSupplierReports();

    // Fetch reports
    const { data: reports, isLoading, error } = useSupplierReportsList({
        status: activeTab === 'all' ? undefined : activeTab,
    });

    // Mutations
    const acknowledgeReport = useAcknowledgeReport();
    const resolveReport = useResolveReport();
    const disputeReport = useDisputeReport();

    // Show toast on new report
    useEffect(() => {
        if (lastEvent?.type === 'INSERT') {
            toast.info(`New missing items report received`, {
                description: 'A restaurant has reported missing items from a delivery.',
                icon: <Bell className="w-4 h-4" />,
            });
        }
    }, [lastEvent]);

    // Filter reports by search
    const filteredReports = useMemo(() => {
        if (!reports) return [];

        let result = [...reports];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (r) => r.restaurant?.name?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [reports, searchQuery]);

    const toggleReport = (reportId: string) => {
        setExpandedReports((prev) =>
            prev.includes(reportId)
                ? prev.filter((id) => id !== reportId)
                : [...prev, reportId]
        );
    };

    const getStatusBadge = (status: ReportStatus) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                    </Badge>
                );
            case 'acknowledged':
                return (
                    <Badge variant="secondary" className="bg-[#009EE0]/10 text-[#009EE0] hover:bg-[#009EE0]/10">
                        <Check className="w-3 h-3 mr-1" />
                        Acknowledged
                    </Badge>
                );
            case 'resolved':
                return (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                        <Check className="w-3 h-3 mr-1" />
                        Resolved
                    </Badge>
                );
            case 'disputed':
                return (
                    <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                        <X className="w-3 h-3 mr-1" />
                        Disputed
                    </Badge>
                );
            default:
                return (
                    <Badge variant="secondary">
                        {status}
                    </Badge>
                );
        }
    };

    const handleAcknowledge = async (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await acknowledgeReport.mutateAsync(reportId);
            toast.success('Report acknowledged');
        } catch {
            toast.error('Failed to acknowledge report');
        }
    };

    const handleOpenResolveDialog = (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedReportId(reportId);
        setResolutionType('redelivery_scheduled');
        setResolutionNote('');
        setResolveDialogOpen(true);
    };

    const handleResolve = async () => {
        if (!selectedReportId) return;
        try {
            await resolveReport.mutateAsync({
                reportId: selectedReportId,
                resolutionType,
                note: resolutionNote || undefined,
            });
            toast.success('Report marked as resolved');
            setResolveDialogOpen(false);
            setSelectedReportId(null);
        } catch {
            toast.error('Failed to resolve report');
        }
    };

    const handleOpenDisputeDialog = (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedReportId(reportId);
        setDisputeReason('items_delivered');
        setDisputeDetails('');
        setDisputeDialogOpen(true);
    };

    const handleOpenResolutionSheet = (report: MissingItemsReportWithRestaurant, e: React.MouseEvent) => {
        e.stopPropagation();
        setReportForResolution(report);
        setResolutionSheetOpen(true);
    };

    const handleDispute = async () => {
        if (!selectedReportId) return;
        try {
            await disputeReport.mutateAsync({
                reportId: selectedReportId,
                reason: disputeReason,
                details: disputeDetails || undefined,
            });
            toast.success('Dispute submitted');
            setDisputeDialogOpen(false);
            setSelectedReportId(null);
        } catch {
            toast.error('Failed to submit dispute');
        }
    };

    const getTabCount = (status: TabValue) => {
        if (!reports) return 0;
        if (status === 'all') return reports.length;
        return reports.filter((r) => r.status === status).length;
    };

    if (error) {
        return (
            <MainContent>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-destructive">Error loading reports</p>
                    </div>
                </div>
            </MainContent>
        );
    }

    return (
        <MainContent>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">Missing Items Reports</h1>
                            <p className="text-muted-foreground">
                                Manage missing items reports from restaurants
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                                    Live updates
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                                    Connecting...
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by restaurant name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-6">
                    <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
                        <TabsTrigger value="all" className="text-xs sm:text-sm">
                            All ({getTabCount('all')})
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="text-xs sm:text-sm">
                            Pending ({getTabCount('pending')})
                        </TabsTrigger>
                        <TabsTrigger value="acknowledged" className="text-xs sm:text-sm">
                            Acknowledged ({getTabCount('acknowledged')})
                        </TabsTrigger>
                        <TabsTrigger value="resolved" className="text-xs sm:text-sm">
                            Resolved ({getTabCount('resolved')})
                        </TabsTrigger>
                        <TabsTrigger value="disputed" className="text-xs sm:text-sm">
                            Disputed ({getTabCount('disputed')})
                        </TabsTrigger>
                    </TabsList>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredReports.length > 0 ? (
                        <div className="space-y-4 mt-4">
                            {filteredReports.map((report) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    isExpanded={expandedReports.includes(report.id)}
                                    onToggle={() => toggleReport(report.id)}
                                    getStatusBadge={getStatusBadge}
                                    onAcknowledge={(e) => handleAcknowledge(report.id, e)}
                                    onResolve={(e) => handleOpenResolveDialog(report.id, e)}
                                    onDispute={(e) => handleOpenDisputeDialog(report.id, e)}
                                    onSendItems={(e) => handleOpenResolutionSheet(report, e)}
                                    isAcknowledging={acknowledgeReport.isPending}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card className="mt-4">
                            <CardContent className="py-12 text-center">
                                <Inbox className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    No missing items reports yet
                                </h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    {searchQuery
                                        ? 'No reports match your search criteria. Try a different search term.'
                                        : 'When restaurants report missing items from your deliveries, they\'ll appear here.'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </Tabs>
            </div>

            {/* Resolve Dialog */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark Report as Resolved</DialogTitle>
                        <DialogDescription>
                            Select how this issue was resolved and add any notes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <Label>Resolution Type</Label>
                            <RadioGroup
                                value={resolutionType}
                                onValueChange={(v) => setResolutionType(v as ResolutionType)}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="redelivery_scheduled" id="redelivery" />
                                    <Label htmlFor="redelivery" className="font-normal cursor-pointer">
                                        <RefreshCw className="w-4 h-4 inline mr-2" />
                                        Redelivery scheduled
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="credit_issued" id="credit" />
                                    <Label htmlFor="credit" className="font-normal cursor-pointer">
                                        <FileText className="w-4 h-4 inline mr-2" />
                                        Credit issued
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="other" id="other" />
                                    <Label htmlFor="other" className="font-normal cursor-pointer">
                                        Other
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="resolution-note">Note (optional)</Label>
                            <Textarea
                                id="resolution-note"
                                placeholder="Add any additional details..."
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResolve}
                            disabled={resolveReport.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {resolveReport.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Mark Resolved
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dispute Dialog */}
            <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Dispute Report</DialogTitle>
                        <DialogDescription>
                            Explain why you are disputing this missing items report.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <Label>Dispute Reason</Label>
                            <RadioGroup
                                value={disputeReason}
                                onValueChange={(v) => setDisputeReason(v as DisputeReason)}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="items_delivered" id="delivered" />
                                    <Label htmlFor="delivered" className="font-normal cursor-pointer">
                                        Items were delivered
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="quantities_incorrect" id="quantities" />
                                    <Label htmlFor="quantities" className="font-normal cursor-pointer">
                                        Quantities reported are incorrect
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="other" id="dispute-other" />
                                    <Label htmlFor="dispute-other" className="font-normal cursor-pointer">
                                        Other reason
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dispute-details">Details</Label>
                            <Textarea
                                id="dispute-details"
                                placeholder="Provide details about your dispute..."
                                value={disputeDetails}
                                onChange={(e) => setDisputeDetails(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDispute}
                            disabled={disputeReport.isPending}
                            variant="destructive"
                        >
                            {disputeReport.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <MessageSquareWarning className="w-4 h-4 mr-2" />
                            )}
                            Submit Dispute
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Order Resolution Sheet for Sending Items */}
            <OrderResolutionSheet
                open={resolutionSheetOpen}
                onOpenChange={setResolutionSheetOpen}
                report={reportForResolution}
            />
        </MainContent>
    );
}

// Report Card Component
interface ReportCardProps {
    report: MissingItemsReportWithRestaurant;
    isExpanded: boolean;
    onToggle: () => void;
    getStatusBadge: (status: ReportStatus) => React.ReactNode;
    onAcknowledge: (e: React.MouseEvent) => void;
    onResolve: (e: React.MouseEvent) => void;
    onDispute: (e: React.MouseEvent) => void;
    onSendItems: (e: React.MouseEvent) => void;
    isAcknowledging: boolean;
}

function ReportCard({
    report,
    isExpanded,
    onToggle,
    getStatusBadge,
    onAcknowledge,
    onResolve,
    onDispute,
    onSendItems,
    isAcknowledging,
}: ReportCardProps) {
    return (
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
            <Card className={cn(
                "overflow-hidden border-l-4 transition-all",
                report.status === 'pending'
                    ? "border-l-amber-500"
                    : report.status === 'disputed'
                        ? "border-l-red-500"
                        : report.status === 'resolved'
                            ? "border-l-green-500"
                            : "border-l-[#009EE0]"
            )}>
                <CollapsibleTrigger asChild>
                    <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "transition-transform duration-200 mt-1",
                                    isExpanded && "rotate-180"
                                )}>
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-semibold text-foreground">
                                            {report.restaurant?.name || 'Unknown Restaurant'}
                                        </span>
                                        {getStatusBadge(report.status)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(report.created_at), 'MMM d, yyyy')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            {report.items_count || 0} item{(report.items_count || 0) !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-red-600 font-medium">
                                            {"\u20AC"}{Number(report.total_missing_value || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-9 sm:ml-0">
                                <span className="text-xs text-muted-foreground hidden sm:block">
                                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                </span>
                                {/* Quick action buttons */}
                                {report.status === 'pending' && (
                                    <Button
                                        size="sm"
                                        className="bg-[#009EE0] hover:bg-[#0088C4]"
                                        onClick={onAcknowledge}
                                        disabled={isAcknowledging}
                                    >
                                        {isAcknowledging ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-1" />
                                                Acknowledge
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <ReportDetails
                        reportId={report.id}
                        status={report.status}
                        onResolve={onResolve}
                        onDispute={onDispute}
                        onSendItems={onSendItems}
                    />
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

// Report Details Component
interface ReportDetailsProps {
    reportId: string;
    status: ReportStatus;
    onResolve: (e: React.MouseEvent) => void;
    onDispute: (e: React.MouseEvent) => void;
    onSendItems: (e: React.MouseEvent) => void;
}

function ReportDetails({ reportId, status, onResolve, onDispute, onSendItems }: ReportDetailsProps) {
    const { data, isLoading } = useSupplierReportDetails(reportId);

    if (isLoading) {
        return (
            <CardContent className="pt-0 pb-4 border-t border-border">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        );
    }

    if (!data) {
        return (
            <CardContent className="pt-0 pb-4 border-t border-border">
                <div className="py-4 text-center text-muted-foreground">
                    Failed to load report details
                </div>
            </CardContent>
        );
    }

    return (
        <CardContent className="pt-0 pb-4 border-t border-border">
            <div className="mt-4 space-y-6">
                {/* Restaurant Contact Info */}
                {data.restaurant && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Restaurant Contact
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Name:</span>
                                <span className="ml-2 font-medium">{data.restaurant.name}</span>
                            </div>
                            {data.restaurant.contact_email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <a
                                        href={`mailto:${data.restaurant.contact_email}`}
                                        className="text-[#009EE0] hover:underline"
                                    >
                                        {data.restaurant.contact_email}
                                    </a>
                                </div>
                            )}
                            {data.restaurant.contact_phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <a
                                        href={`tel:${data.restaurant.contact_phone}`}
                                        className="text-[#009EE0] hover:underline"
                                    >
                                        {data.restaurant.contact_phone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Delivery Info */}
                {data.delivery && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Delivery Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Delivery Date:</span>
                                <span className="ml-2 font-medium">
                                    {format(new Date(data.delivery.delivery_date), 'MMM d, yyyy')}
                                </span>
                            </div>
                            {data.delivery.order_number && (
                                <div>
                                    <span className="text-muted-foreground">Order Number:</span>
                                    <span className="ml-2 font-medium">{data.delivery.order_number}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Original Receipt Image */}
                {data.delivery?.receipt_image_url && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <Image className="w-4 h-4" />
                            Original Receipt
                        </h4>
                        <div className="space-y-3">
                            <a
                                href={data.delivery.receipt_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <img
                                    src={data.delivery.receipt_image_url}
                                    alt="Original receipt"
                                    className="max-w-full max-h-96 rounded-lg border border-border object-contain bg-white"
                                    onError={(e) => {
                                        // Hide if image fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </a>
                            <a
                                href={data.delivery.receipt_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-[#009EE0] hover:underline"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View full size
                            </a>
                        </div>
                    </div>
                )}

                {/* Missing Items Table */}
                <div>
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Missing Items
                    </h4>

                    {data.items && data.items.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Item Name</TableHead>
                                        <TableHead className="text-right">Expected</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-right">Missing</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Missing Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            <TableCell className="text-right">
                                                {item.expected_quantity} {item.unit || ''}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.received_quantity} {item.unit || ''}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600 font-medium">
                                                {item.missing_quantity} {item.unit || ''}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {"\u20AC"}{Number(item.price_per_unit || 0).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600 font-medium">
                                                {"\u20AC"}{Number(item.total_missing_value || 0).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-red-50">
                                        <TableCell colSpan={5} className="font-semibold">
                                            Total Missing Value
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-red-600 text-lg">
                                            {"\u20AC"}{Number(data.total_missing_value || 0).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm p-4 bg-muted/30 rounded-lg">
                            No specific items listed in this report
                        </p>
                    )}
                </div>

                {/* Notes */}
                {data.notes && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Notes
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                    {status === 'pending' && (
                        <>
                            <Button
                                onClick={onDispute}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <MessageSquareWarning className="w-4 h-4 mr-2" />
                                Dispute
                            </Button>
                        </>
                    )}
                    {status === 'acknowledged' && (
                        <>
                            <Button
                                onClick={onSendItems}
                                className="bg-[#009EE0] hover:bg-[#0088C4]"
                            >
                                <Truck className="w-4 h-4 mr-2" />
                                Send Items
                            </Button>
                            <Button
                                onClick={onResolve}
                                variant="outline"
                                className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Mark Resolved
                            </Button>
                            <Button
                                onClick={onDispute}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <MessageSquareWarning className="w-4 h-4 mr-2" />
                                Dispute
                            </Button>
                        </>
                    )}
                    {status === 'resolved' && data.resolved_at && (
                        <div className="text-sm text-muted-foreground">
                            <Check className="w-4 h-4 inline mr-1 text-green-600" />
                            Resolved {formatDistanceToNow(new Date(data.resolved_at), { addSuffix: true })}
                        </div>
                    )}
                    {status === 'disputed' && (
                        <div className="text-sm text-muted-foreground">
                            <X className="w-4 h-4 inline mr-1 text-red-600" />
                            This report has been disputed
                        </div>
                    )}
                </div>
            </div>
        </CardContent>
    );
}
