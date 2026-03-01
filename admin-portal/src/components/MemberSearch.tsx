import React, { useCallback, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, Check, XCircle, Loader2 } from "lucide-react";
import { Member } from "@/types/room-booking.type";
import { cn } from "@/lib/utils";

interface MemberSearchComponentProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showResults: boolean;
  searchResults: Member[];
  isSearching: boolean;
  selectedMember: Member | null;
  onSelectMember: (member: Member) => void;
  onClearMember: () => void;
  onFocus: () => void;
  label?: string;
  className?: string;
}

export const MemberSearchComponent = React.memo(({
  searchTerm,
  onSearchChange,
  showResults,
  searchResults,
  isSearching,
  selectedMember,
  onSelectMember,
  onClearMember,
  onFocus,
  label = "Select Member *",
  className,
}: MemberSearchComponentProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const handleInputFocus = useCallback(() => {
    onFocus();
  }, [onFocus]);

  return (
    <div className={`relative ${className || "md:col-span-2"}`}>
      <Label>{label}</Label>
      <div className="relative mt-2">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search member by name, email, or membership number..."
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10 pr-10"
        />
        {selectedMember && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={onClearMember}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isSearching ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                Searching members...
              </span>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((member: Member) => (
              <div
                key={member.id}
                className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b ${selectedMember?.id === member.id ? "bg-blue-50" : ""
                  }`}
                onClick={() => onSelectMember(member)}
              >
                <User className="h-4 w-4 text-muted-foreground mr-3" />
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center justify-between">
                    <div className="flex items-center">
                      <span>{member.Name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-2 text-[8px] h-3 px-1 uppercase font-bold",
                          member.Status?.toLowerCase() === "active" ? "bg-green-50 text-green-700 border-green-200" :
                            member.Status?.toLowerCase() === "inactive" ? "bg-red-50 text-red-700 border-red-200" :
                              member.Status?.toLowerCase() === "suspended" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-slate-50 text-slate-700 border-slate-200"
                        )}
                      >
                        {member.Status}
                      </Badge>
                    </div>
                    {member.Balance !== undefined && (
                      <Badge
                        variant={
                          member.Balance >= 0 ? "outline" : "destructive"
                        }
                        className="ml-2"
                      >
                        Balance: PKR {member.Balance.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {member.Membership_No &&
                      `Membership #: ${member.Membership_No}`}
                    {member.membershipNumber &&
                      `Membership #: ${member.membershipNumber}`}
                    {member.email && ` • Email: ${member.email}`}
                    {member.phone && ` • Phone: ${member.phone}`}
                  </div>
                </div>
                {selectedMember?.id === member.id && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      )}

      {/* Selected Member Display */}
      {selectedMember && (
        <div className={cn(
          "mt-2 p-3 border rounded-md shadow-sm transition-all animate-in fade-in slide-in-from-top-1",
          selectedMember.Status?.toLowerCase() === "active" ? "bg-green-50 border-green-200" :
            selectedMember.Status?.toLowerCase() === "inactive" ? "bg-red-50 border-red-200" :
              selectedMember.Status?.toLowerCase() === "suspended" ? "bg-amber-50 border-amber-200" :
                "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center">
                <User className={cn(
                  "h-4 w-4 mr-2",
                  selectedMember.Status?.toLowerCase() === "active" ? "text-green-600" :
                    selectedMember.Status?.toLowerCase() === "inactive" ? "text-red-600" :
                      selectedMember.Status?.toLowerCase() === "suspended" ? "text-amber-600" :
                        "text-slate-600"
                )} />
                {selectedMember.Name}
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2 text-[10px] h-4 px-1.5 uppercase font-bold",
                    selectedMember.Status?.toLowerCase() === "active" ? "bg-green-100 text-green-700 border-green-200" :
                      selectedMember.Status?.toLowerCase() === "inactive" ? "bg-red-100 text-red-700 border-red-200" :
                        selectedMember.Status?.toLowerCase() === "suspended" ? "bg-amber-100 text-amber-700 border-amber-200" :
                          "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {selectedMember.Status || "Unknown"}
                </Badge>
              </div>
              <div className={cn(
                "text-xs mt-1",
                selectedMember.Status?.toLowerCase() === "active" ? "text-green-600" :
                  selectedMember.Status?.toLowerCase() === "inactive" ? "text-red-600" :
                    selectedMember.Status?.toLowerCase() === "suspended" ? "text-amber-600" :
                      "text-slate-600"
              )}>
                {selectedMember.Membership_No &&
                  `Membership: #${selectedMember.Membership_No}`}
                {selectedMember.membershipNumber &&
                  `Membership: #${selectedMember.membershipNumber}`}
                {selectedMember.Balance !== undefined && (
                  <div className="mt-1 space-y-1">
                    <Badge
                      variant={
                        selectedMember.Balance >= 0
                          ? "outline"
                          : "destructive"
                      }
                      className="bg-green-100 text-green-800"
                    >
                      Account Balance: PKR{" "}
                      {selectedMember.Balance.toLocaleString()}
                    </Badge>
                    <div className="text-xs">
                      <span className="text-green-700">
                        DR: PKR{" "}
                        {selectedMember.drAmount?.toLocaleString() || "0"}
                      </span>
                      {" • "}
                      <span className="text-red-700">
                        CR: PKR{" "}
                        {selectedMember.crAmount?.toLocaleString() || "0"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Selected
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
});

MemberSearchComponent.displayName = "MemberSearchComponent";