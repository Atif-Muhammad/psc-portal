import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Send, Search, Bell, Megaphone, History, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getMembers, authAdmin, sendNotification, getNotifications, getMemberNotifications } from "../../config/apis";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { UnifiedDatePicker } from "@/components/UnifiedDatePicker";

// Quill editor configuration (Matching AboutUsTab/Contents)
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'indent', 'align',
  'link', 'image', 'color', 'background'
];

// Custom CSS to fix editor height consistently
const editorStyles = `
  .rich-text-editor .ql-container {
    min-height: 200px;
    font-size: 16px;
  }
  .rich-text-editor .ql-editor {
    min-height: 200px;
  }
`;


export default function Notifications() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Store full member objects to keep them visible when selected
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);

  const [sendToAll, setSendToAll] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("notifications");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingNotification, setViewingNotification] = useState<any>(null);

  // States for Member History tab
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [selectedHistoryMember, setSelectedHistoryMember] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { toast } = useToast();

  // Fetch notifications history
  const { data: notificationsData, refetch: refetchHistory } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const notificationHistory = notificationsData || [];

  // Fetch members with search
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["members", searchTerm],
    queryFn: () => getMembers({ search: searchTerm }),
    enabled: isCreateOpen, // Only fetch when dialog is open
  });

  const membersList = membersData?.data || [];

  // Combine fetched members and selected members for the table display
  const displayedMembers = useMemo(() => {
    if (!membersList) return selectedMembers;

    // Create a map of currently fetched members
    const fetchedMap = new Map(membersList.map((m: any) => [m.Membership_No, m]));

    // Add selected members to the map if they aren't already there
    selectedMembers.forEach(m => {
      if (!fetchedMap.has(m.Membership_No)) {
        fetchedMap.set(m.Membership_No, m);
      }
    });

    const allKnown = Array.from(fetchedMap.values());

    return allKnown.filter(m => {
      return true;
    });
  }, [membersList, selectedMembers]);


  const { mutate: handleSend, isPending: isSendingNotification } = useMutation({
    mutationFn: async () => {
      const isAnnouncementTab = activeTab === "announcements";
      const payload = {
        title: notificationTitle,
        description: messageContent,
        sendToAll: isAnnouncementTab ? false : sendToAll,
        targetStatuses: isAnnouncementTab ? ["active"] : (sendToAll ? [] : selectedStatuses),
        recipients: (sendToAll || isAnnouncementTab)
          ? "ALL"
          : selectedMembers.map(m => m.Membership_No),
        isAnnouncement: isAnnouncementTab
      };

      return sendNotification(payload);
    },
    onSuccess: () => {
      toast({ title: "Notifications sent successfully" });
      setIsCreateOpen(false);
      refetchHistory();
      setSelectedMembers([]);
      setNotificationTitle("");
      setMessageContent("");
      setSendToAll(false);
      setSelectedStatuses([]);
      setSearchTerm("");
    },
    onError: () => {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  });

  const toggleMember = (member: any) => {
    setSelectedMembers(prev => {
      const exists = prev.some(m => m.Membership_No === member.Membership_No);
      if (exists) {
        return prev.filter(m => m.Membership_No !== member.Membership_No);
      } else {
        return [...prev, member];
      }
    });
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => {
      if (prev.includes(status)) return prev.filter(s => s !== status);
      return [...prev, status];
    });
    setSendToAll(false);
  };

  const isSelected = (membershipNo: string) => {
    return selectedMembers.some(m => m.Membership_No === membershipNo);
  }

  const showManualSelection = !sendToAll && activeTab !== "announcements";

  // Determine button disabled state
  const isSendDisabled =
    !messageContent ||
    !notificationTitle ||
    isSendingNotification ||
    (!sendToAll && activeTab !== "announcements" && selectedStatuses.length === 0 && selectedMembers.length === 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <style>{editorStyles}</style>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Communication Center
          </h2>
          <p className="text-muted-foreground ml-10">Manage notifications and broadcasts to members</p>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="member-history" className="gap-2">
            <History className="h-4 w-4" /> Member History
          </TabsTrigger>
          {/* <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Notification History
            </h3>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Send General Notification</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">

                  <div>
                    <Label>Title</Label>
                    <Input
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder="Notification Title"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <div className="mt-2 rich-text-editor">
                      <ReactQuill
                        theme="snow"
                        value={messageContent}
                        onChange={setMessageContent}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Enter your message here..."
                        className="mb-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 py-2">
                      <Switch
                        id="send-to-all"
                        checked={sendToAll}
                        onCheckedChange={(checked) => {
                          setSendToAll(checked);
                          if (checked) {
                            setSelectedStatuses([]);
                          }
                        }}
                      />
                      <Label htmlFor="send-to-all" className="font-bold">Send to All Members</Label>
                    </div>

                    {!sendToAll && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border rounded-lg bg-secondary/10">
                        {["REGULAR", "CLEAR", "ABSENT", "CANCELLED", "DEFAULTER", "DIED", "HONORARY", "SUSPENDED", "TERMINATED"].map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedStatuses.includes(status)}
                              onCheckedChange={() => toggleStatus(status)}
                            />
                            <Label htmlFor={`status-${status}`} className="cursor-pointer capitalize">
                              {status.toLowerCase()}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showManualSelection && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Select Recipients (Optional if status selected)</Label>
                      </div>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search members by name or membership number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="border rounded-md max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Select</TableHead>
                              <TableHead>Member Name</TableHead>
                              <TableHead>Membership No</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Contact</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayedMembers.map((member: any) => (
                              <TableRow key={member.Membership_No}>
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected(member.Membership_No)}
                                    onCheckedChange={() => toggleMember(member)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{member.Name}</TableCell>
                                <TableCell>{member.Membership_No}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{member.Email}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{member.Contact_No}</TableCell>
                              </TableRow>
                            ))}
                            {displayedMembers.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                  {searchTerm ? "No members found" : "Start typing to search members"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {selectedMembers.length} members
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleSend()} disabled={isSendDisabled}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSendingNotification ? "Sending..." : "Send Notification"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Sent By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationHistory
                      .filter((n: any) => !n.isAnnouncement)
                      .map((notification: any) => (
                        <TableRow key={notification.id}>
                          <TableCell className="whitespace-nowrap">
                            {notification.createdAt ? format(new Date(notification.createdAt), "dd MMM yyyy, hh:mm a") : "N/A"}
                          </TableCell>
                          <TableCell className="font-semibold">{notification.title}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="ql-snow">
                              <div
                                className="line-clamp-2 text-sm ql-editor !p-0"
                                dangerouslySetInnerHTML={{ __html: notification.description || "" }}
                                title={notification.description?.replace(/<[^>]*>?/gm, '')}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{notification._count?.deliveries || 0} members</TableCell>
                          <TableCell className="text-sm font-medium">{notification.createdBy || "System"}</TableCell>
                          <TableCell>
                            <Badge className={notification.delivered ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                              {notification.delivered ? "SENT" : "PENDING"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewingNotification(notification);
                                setIsViewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {notificationHistory.filter((n: any) => !n.isAnnouncement).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No notifications sent yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="member-history" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Search Member History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or membership no..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-md max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableBody>
                      {useQuery({
                        queryKey: ["members-history-search", historySearchTerm],
                        queryFn: () => getMembers({ search: historySearchTerm }),
                        enabled: historySearchTerm.length > 2
                      }).data?.data?.map((member: any) => (
                        <TableRow
                          key={member.Membership_No}
                          className={`cursor-pointer transition-colors ${selectedHistoryMember?.Membership_No === member.Membership_No ? 'bg-primary/10' : 'hover:bg-muted'}`}
                          onClick={() => setSelectedHistoryMember(member)}
                        >
                          <TableCell>
                            <div className="font-medium text-sm">{member.Name}</div>
                            <div className="text-xs text-muted-foreground">{member.Membership_No}</div>
                          </TableCell>
                        </TableRow>
                      )) || (
                          <TableRow>
                            <TableCell className="text-center py-8 text-muted-foreground text-sm">
                              {historySearchTerm.length > 2 ? "No members found" : "Type at least 3 characters to search"}
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    {selectedHistoryMember ? `History for ${selectedHistoryMember.Name}` : "Member History"}
                  </CardTitle>
                  {selectedHistoryMember && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Membership No: {selectedHistoryMember.Membership_No}
                    </p>
                  )}
                </div>
                {selectedHistoryMember && (
                  <div className="flex items-center gap-4">
                    <div className="w-64">
                      <UnifiedDatePicker
                        selectionMode="range"
                        value={startDate}
                        endDate={endDate}
                        allowPastDates={true}
                        onChange={(date, type) => {
                          if (type === "start") setStartDate(date);
                          else if (type === "end") setEndDate(date);
                        }}
                        placeholder="Filter by date range"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStartDate(undefined);
                          setEndDate(undefined);
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedHistoryMember ? (
                        <MemberHistoryTable
                          membershipNo={selectedHistoryMember.Membership_No}
                          startDate={startDate}
                          endDate={endDate}
                          setViewOpen={setIsViewOpen}
                          setViewingNoti={setViewingNotification}
                        />
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            Select a member to view their notification history
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Post New Announcement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Enter announcement title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message content</Label>
                  <div className="mt-1 rich-text-editor">
                    <ReactQuill
                      theme="snow"
                      value={messageContent}
                      onChange={setMessageContent}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Enter the message to broadcast to all active members..."
                      className="mb-2"
                    />
                  </div>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                    <Megaphone className="h-4 w-4" />
                    Targeting: <strong>All Active Members</strong>
                  </div>
                  <p className="text-xs text-blue-600/80">
                    This will send a push notification to all members with status 'CLEAR' and save it as a persistent announcement.
                  </p>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => handleSend()}
                  disabled={!notificationTitle || !messageContent || isSendingNotification}
                >
                  {isSendingNotification ? (
                    "Broadcasting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post Announcement
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Announcement History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Sent By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notificationHistory
                        .filter((n: any) => n.isAnnouncement)
                        .map((notification: any) => (
                          <TableRow key={notification.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {notification.createdAt ? format(new Date(notification.createdAt), "dd MMM yyyy, hh:mm a") : "N/A"}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">{notification.title}</TableCell>
                            <TableCell className="max-w-xs">
                              <div className="ql-snow">
                                <div
                                  className="line-clamp-2 text-xs ql-editor !p-0"
                                  dangerouslySetInnerHTML={{ __html: notification.description || "" }}
                                  title={notification.description?.replace(/<[^>]*>?/gm, '')}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{notification.createdBy || "System"}</TableCell>
                            <TableCell>
                              <Badge className={notification.delivered ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                                {notification.delivered ? "SENT" : "PENDING"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setViewingNotification(notification);
                                  setIsViewOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {notificationHistory.filter((n: any) => n.isAnnouncement).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                            No announcements posted yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Notification Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{viewingNotification?.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{viewingNotification?.createdAt ? format(new Date(viewingNotification.createdAt), "dd MMM yyyy, hh:mm a") : ""}</span>
                  <span>•</span>
                  <span>Sent by: {viewingNotification?.createdBy || "System"}</span>
                </div>
              </div>
              <Badge className={viewingNotification?.delivered ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                {viewingNotification?.delivered ? "SENT" : "PENDING"}
              </Badge>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none py-2">
              <div className="ql-snow">
                <div
                  className="notification-content-preview ql-editor !p-0"
                  dangerouslySetInnerHTML={{ __html: viewingNotification?.description || "" }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberHistoryTable({
  membershipNo,
  startDate,
  endDate,
  setViewOpen,
  setViewingNoti
}: {
  membershipNo: string,
  startDate?: Date,
  endDate?: Date,
  setViewOpen: any,
  setViewingNoti: any
}) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["member-notifications", membershipNo, startDate, endDate],
    queryFn: () => getMemberNotifications(
      membershipNo,
      startDate?.toISOString(),
      endDate?.toISOString()
    ),
    enabled: !!membershipNo
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center py-8">Loading history...</TableCell>
      </TableRow>
    );
  }

  if (!history || history.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
          No notifications found for this member
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {history.map((notification: any) => (
        <TableRow key={notification.id}>
          <TableCell className="whitespace-nowrap text-xs">
            {notification.createdAt ? format(new Date(notification.createdAt), "dd MMM yyyy, hh:mm a") : "N/A"}
          </TableCell>
          <TableCell className="font-semibold text-sm">{notification.title}</TableCell>
          <TableCell className="max-w-xs">
            <div className="ql-snow">
              <div
                className="line-clamp-2 text-xs ql-editor !p-0"
                dangerouslySetInnerHTML={{ __html: notification.description || "" }}
                title={notification.description?.replace(/<[^>]*>?/gm, '')}
              />
            </div>
          </TableCell>
          <TableCell className="text-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewingNoti(notification);
                setViewOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
