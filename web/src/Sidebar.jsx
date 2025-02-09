export function Sidebar({ data, selectedChannel, handleChannelSearch }) {
  if (!data) return null;

  const relatedChannels = data.links
    .filter((link) => link.source.name === selectedChannel || link.target.name === selectedChannel)
    .slice(0, 10)
    .map((link) => {
      const channel = (link.source.name === selectedChannel) ? link.target : link.source;
      return { ...channel, similarity: link.distance, count: link.inter };
    }) ?? [];


  return (
    <div className='absolute top-0 left-0 m-4 flex flex-col w-[calc(100%-2rem)] gap-4 dark:text-white sm:w-80'>
      <input value={selectedChannel} onChange={handleChannelSearch} type='search' list='channels' placeholder='스트리머 검색' className='w-full border-3 border-gray-300 text-xl p-2 outline-0 bg-white focus:border-[#00FFA3] dark:bg-gray-600' />
      <datalist id='channels'>
        {data.nodes.map((node) => (
          <option key={node.id} value={node.name}></option>
        ))}
      </datalist>
      <RelatedChannels relatedChannels={relatedChannels} />
    </div>
  )
}


function RelatedChannels({ relatedChannels }) {
  if (relatedChannels.length === 0) return null;
  
  return (
    <div className='w-full border-3 p-2 border-gray-300 bg-white dark:bg-gray-600 hidden sm:block'>
      <table className='table-fixed w-full'>
        <thead>
          <tr>
            <th className='w-[10%] p-1 text-left'>#</th>
            <th className='w-[50%] p-1 text-left'>채널명</th>
            <th className='w-[20%] p-1 text-left'>유사도</th>
            <th className='w-[20%] p-1 text-left'>중복수</th>
          </tr>
        </thead>
        <tbody>
          {relatedChannels.map((channel, index) => (
            <tr key={channel.id} className='border-t'>
              <td className='p-1'>{index + 1}</td>
              <td className='p-1 whitespace-nowrap overflow-hidden overflow-ellipsis'>{channel.name}</td>
              <td className='p-1'>{(channel.similarity * 100).toFixed(2)}%</td>
              <td className='p-1'>{channel.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
