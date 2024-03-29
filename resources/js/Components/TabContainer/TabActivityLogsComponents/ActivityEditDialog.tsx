import ReactLoader from '@/Components/ReactLoader';
import { Button } from '@/Components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/Components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';


import useShowActivityEditDialog from '@/Hooks/useShowActivityEditDialog';
import { cn } from '@/Libs/Utils';
import { IAgentStatus, IStatus } from '@/types';
import axios from 'axios';
import React, {  ChangeEventHandler, FC, FocusEventHandler, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { BsCheckLg, BsFillQuestionDiamondFill } from 'react-icons/bs';
import { RiExpandUpDownFill } from 'react-icons/ri';
import { toast } from 'react-toastify';
import { addDays, format, parseISO } from 'date-fns';
import { Separator } from '@radix-ui/react-select';
import { formatInTimeZone } from 'date-fns-tz';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import TimeInputToolTip from './TimeInputToolTip';
import { BiCalendar } from 'react-icons/bi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Calendar } from '@/Components/ui/calendar';
import { LogsBySessionId, logsBySessionId } from '../TabActivityLogs';
import useActivityLogs from '@/Hooks/useActivityLogs';



const ActivityEditDialog:FC = () => {
    const {setShowActivityEditDialog,ShowActivityEditDialog,agentLogIdToEdit} = useShowActivityEditDialog();
    const [originalStatus,setOriginalStatus] = useState<IAgentStatus>();
    const [loadingStatus,setLoadingStatus] = useState(false);
    const [updating,setUpdating] = useState(false);
    const [open,setOpen] = useState(false);
    const [statuses,setStatuses] = useState<IStatus[]>();
    const [time,setTime] = useState<{hh:string;mm:string;}>({hh:"01",mm:"00"});
    const [currentStatus,setCurrentStatus] = useState<IStatus>();
    const [date, setDate] = useState<Date>();
    
    const {logs,setLogs}=useActivityLogs();
    const [earlyDepartureReason,setEarlyDepartureReason] = useState<string>();
    const [overTimeReason,setOverTimeReason] = useState<string>();
    const [specialProjectRemark,setSpecialProjectRemark] = useState<string>();

    const handleInputChange:ChangeEventHandler<HTMLInputElement> = useCallback(({target})=>{
        const { id,value } = target;
        if(value.length>2) return null;
        let t=value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        t=t.slice(0,2);
        t=t.length<3?t:t.padStart(2,"0");
        setTime(val=>({...val,[id]:t}));
    },[time]);

    const handleInputBlur:FocusEventHandler<HTMLInputElement> = useCallback(({target}) => {
        const { id,value } = target;
        let t=value;
        if(id==='hh'){
            t=(parseInt(t)>23?'23':t).padStart(2,"0");
        }
        if(id==='mm'){
            t=(parseInt(t)>59?'59':t).padStart(2,"0");
        }
        setTime(val=>({...val,[id]:t}));
    },[time]);

    

    const handleSubmit = useCallback(()=>{
        if(!originalStatus) return;
        if(!date) return toast.info('Select Proper Date');
        if(!currentStatus || currentStatus?.id<1) return toast.info('Select Proper Status');
        
        const agent_log_id = originalStatus?.id;
        const {hh,mm} = time;
        const t = `${hh}:${mm}:00`;
        const dt=`${date.getFullYear().toString()}-${(date.getMonth()+1).toString().padStart(2,"0")}-${date.getDate().toString().padStart(2,"0")}`
        const wholeDt= `${dt} ${t}`;
        const IsoDate= formatInTimeZone(wholeDt,'America/New_York','PPpp');
        setUpdating(true);
        axios.post(route('agent_log.update'),{
            agent_log_id,
            status_id:currentStatus.id,
            early_departure_reason:currentStatus.id===10?earlyDepartureReason:"",
            overtime_reason:currentStatus.id===10?overTimeReason:"",
            special_project_remark:currentStatus.id===12?specialProjectRemark:"",
            timestamp:IsoDate
        })
        .then(async({data}:{data:IAgentStatus[]})=>{
            const formattedLog:LogsBySessionId[] =  await logsBySessionId(data);
            setLogs(logs!.map(lg=>lg.sessionId===formattedLog[0].sessionId?formattedLog[0]:lg));
            setShowActivityEditDialog(false);
        })
        .catch(()=>toast.error('Internal Error. Please try again.'))
        .finally(()=>setUpdating(false));
    },[time,date,originalStatus?.id,logs,currentStatus?.id,earlyDepartureReason,overTimeReason,specialProjectRemark]);

    useEffect(()=>{
        if(!ShowActivityEditDialog)return;
        if(!agentLogIdToEdit) return;
        setLoadingStatus(true);
        setEarlyDepartureReason("");
        setOverTimeReason("");
        setSpecialProjectRemark("");
        axios.get(route('agent_log.edit',{
            agent_log_id:agentLogIdToEdit
        }))
        .then(({data}:{data:{statuses:IStatus[];agent_log:IAgentStatus}})=>{
            const {statuses:Statuses,agent_log} = data;
            setStatuses(Statuses);
            setOriginalStatus(agent_log);
            setCurrentStatus(agent_log.status);
            const time=parseISO(agent_log.created_at);
            
            const hr=time.getHours().toString().padStart(2,"0");
            const mn=time.getMinutes().toString().padStart(2,"0");
            setTime({hh:hr,mm:mn});
            setDate(parseISO(agent_log.created_at));
        })
        .catch(e=>toast.error('Internal Error. Please try again.'))
        .finally(()=>setLoadingStatus(false));
    },[ShowActivityEditDialog]);
    

    const Content:ReactNode = useMemo(()=>(
        <>
            <DialogHeader>
                <DialogTitle>Edit Status</DialogTitle>
                <DialogDescription asChild className='flex flex-col space-y-0.5'>
                    <>
                        <div>
                            Agent:&nbsp;{originalStatus?`${originalStatus.user.first_name} ${originalStatus.user.last_name}, ${originalStatus.user.company_id}`:'Server Error...'}
                        </div>
                        <div>
                            {originalStatus? formatInTimeZone( parseISO( originalStatus.created_at),'America/New_York','yyyy-MM-dd HH:mm zzz') :'Server Error...'}
                        </div>
                        <div>
                            {originalStatus? formatInTimeZone( parseISO( originalStatus.created_at),'Asia/Manila','yyyy-MM-dd HH:mm zzz') :'Server Error...'}
                        </div>
                    </>
                </DialogDescription>
            </DialogHeader>
            <div className='border-b border-b-muted-foreground' />
            <div className=' flex flex-col space-y-3.5'>
                <div className='flex flex-col space-y-2.5'>
                    <Label htmlFor='status' >Select Status:</Label>
                    <Popover  open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                            >
                            {statuses&&statuses
                                ? statuses.find(status=> status.name === currentStatus?.name)?.name
                                : "Select Status..."}
                            <RiExpandUpDownFill className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0">
                            <Command>
                                <CommandInput placeholder="Search Status..." />
                                <CommandEmpty>No Status found.</CommandEmpty>
                                <CommandGroup>
                                    {statuses&&statuses.map(status => (
                                    <CommandItem
                                        key={status.id}
                                        onSelect={val => {
                                        setCurrentStatus(val === status.name ? undefined : status)
                                        setOpen(false)
                                        }}>
                                            <BsCheckLg
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    currentStatus?.id === status.id ? "opacity-100" : "opacity-0"
                                                )}/>
                                            {status.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                
                
                <div className='flex flex-col space-y-1.5'>
                    
                    <p>Timestamp (in PH Time)</p>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[280px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    >
                                    <BiCalendar className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
                            <div className="rounded-md border">
                                <Calendar mode="single" selected={date} onSelect={setDate} />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <TimeInputToolTip>
                        <div className='flex  space-x-0.5'>
                            <div className='flex-1 flex items-center justify-center space-x-0.5'>
                                <div className='hover:opacity-75 transition-opacity duration-300 flex flex-col justify-center items-center relative'>
                                    <Label htmlFor='hh' className='rounded-lg p-1.5 bg-neutral-300 text-black dark:invert absolute left-1 top-[8.5%]'>Hr.</Label>
                                    <Input max={23} min={0} type='number' className='pl-12' onFocus={({target})=>target.select()} onBlur={handleInputBlur} id="hh" value={time.hh} onChange={handleInputChange} />
                                    <p className='self-start ml-2.5 text-[0.65rem] text-muted-foreground'>0~23</p>
                                </div>
                                
                            </div>
                            <div className='font-extrabold text-lg'>:</div>
                            <div className='flex-1 hover:opacity-75 transition-opacity duration-300 flex items-center justify-center space-x-0.5'>
                                <div className='flex flex-col justify-center items-center relative'>
                                    <Label htmlFor='mm' className='rounded-lg p-1.5 bg-neutral-300 text-black dark:invert absolute left-1 top-[8.5%]'>Min.</Label>
                                    <Input max={59} min={0} type='number' className='pl-12' onFocus={({target})=>target.select()} onBlur={handleInputBlur} id="mm" value={time.mm} onChange={handleInputChange} />
                                    <p className='self-start ml-2.5 text-[0.65rem] text-muted-foreground'>0~59</p>
                                </div>
                            </div>
                        </div>
                    </TimeInputToolTip>
                </div>
                {
                    currentStatus&&currentStatus.id===10&&(
                        <>
                            <div className='flex flex-col space-y-1.5'>
                                <Label htmlFor='early' >Early Departure Reason</Label>
                                <Input onChange={({target})=>setEarlyDepartureReason(target.value)} value={earlyDepartureReason} id='early' placeholder='(optional...)'/>
                            </div>
                            <div className='flex flex-col space-y-1.5'>
                                <Label htmlFor='ot' >Overtime Reason</Label>
                                <Input onChange={({target})=>setOverTimeReason(target.value)} value={overTimeReason} id='ot' placeholder='(optional...)'/>
                            </div>
                        </>
                    )
                }
                {
                    currentStatus&&currentStatus.id===12&&(
                        <>
                            <div className='flex flex-col space-y-1.5'>
                                <Label htmlFor='sar' >Special Assignment Remarks</Label>
                                <Input onChange={({target})=>setSpecialProjectRemark(target.value)} value={specialProjectRemark} id='sar' placeholder='(optional...)'/>
                            </div>
                        </>
                    )
                }
            </div>
            <DialogFooter>
                <Button disabled={updating} onClick={()=>setShowActivityEditDialog(false)} variant='secondary' size='sm' className='font-semibold'>Cancel</Button>
                <Button disabled={updating} onClick={handleSubmit} variant='outline' size='sm' className='font-semibold'>Update</Button>
            </DialogFooter>
        </>
    ),[statuses,currentStatus,open,time,date,updating,earlyDepartureReason,overTimeReason,specialProjectRemark]);

    return (
        <Dialog open={ShowActivityEditDialog} onOpenChange={setShowActivityEditDialog} >
            <DialogContent className='max-w-xs text-sm'>
                {loadingStatus? <div className='py-40'> <ReactLoader /> </div> :Content}
            </DialogContent>
        </Dialog>
    )
}

export default ActivityEditDialog;
