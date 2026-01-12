import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ClubRulesTab from "./ClubRulesTab"

export default function RulesTab() {
    return (
        <Tabs defaultValue="club" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="club">Club Bylaws</TabsTrigger>
                <TabsTrigger value="room">Guestrooms Policy</TabsTrigger>
                <TabsTrigger value="hall">Banquet Reservation Policy</TabsTrigger>
                <TabsTrigger value="lawn">Banquet(outdoor) Reservation Policy</TabsTrigger>
                <TabsTrigger value="photoshoot">Photoshoot Policy</TabsTrigger>
            </TabsList>

            <div className="mt-6">
                <TabsContent value="club">
                    <ClubRulesTab type="CLUB" title="Club Bylaws" />
                </TabsContent>
                <TabsContent value="room">
                    <ClubRulesTab type="ROOM" title="Guestrooms Policy" />
                </TabsContent>
                <TabsContent value="hall">
                    <ClubRulesTab type="HALL" title="Banquet Reservation Policy" />
                </TabsContent>
                <TabsContent value="lawn">
                    <ClubRulesTab type="LAWN" title="Banquet(outdoor) Reservation Policy" />
                </TabsContent>
                <TabsContent value="photoshoot">
                    <ClubRulesTab type="PHOTOSHOOT" title="Photoshoot Policy" />
                </TabsContent>
            </div>
        </Tabs>
    )
}
