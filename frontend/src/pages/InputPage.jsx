import { Upload, FileText, ArrowRight } from 'lucide-react'

function InputPage() {
  return (
    <div className="px-12 py-10 max-w-4xl mx-auto">
      <p className="text-sm text-[#4638E0] font-medium mb-2">Content Engine</p>
      <h1 className="font-display text-3xl font-semibold mb-1 text-[#15161A]">
        What are we repurposing today?
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Upload a file or paste text — PRISM handles the rest.
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-[#ECECEF] p-6">
        <textarea
          className="w-full h-32 text-sm resize-none focus:outline-none placeholder:text-gray-400"
          placeholder="Paste a blog post, transcript, or any source text..."
        />

        <div className="flex items-center justify-between pt-4 border-t border-[#F0F0F2] mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-[#15161A] transition-colors">
            <Upload size={16} />
            Attach file
            <input type="file" className="hidden" />
          </label>

          <button className="flex items-center gap-2 bg-gradient-to-br from-[#6C5CE7] to-[#4638E0] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            Generate
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-8">
        {[
          ['Twitter/X', '#E5484D'],
          ['LinkedIn', '#2F80ED'],
          ['Instagram', '#9B51E0'],
          ['YouTube', '#F2994A'],
          ['Email', '#27AE60'],
        ].map(([name, color]) => (
          <div key={name} className="bg-white border border-[#ECECEF] rounded-xl p-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-medium text-gray-600">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InputPage